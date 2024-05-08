import {
  CircularDataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  LoadingState,
  MetricFindValue,
} from '@grafana/data';

import { 
  CdpQuery, 
  CdpDataSourceOptions, 
  CdpDefaultQuery, 
  CdpVariableQuery
} from './types';

import { getTemplateSrv } from '@grafana/runtime';
import { merge, Observable } from 'rxjs';
import { defaults } from 'lodash';
import studio from 'cdp-client';

class NotificationListener {
  username: string;
  password: string;
  lastError!: string;

  constructor(instanceSettings: DataSourceInstanceSettings<CdpDataSourceOptions>) {
    this.username = instanceSettings.jsonData.username;
    this.password = instanceSettings.jsonData.password;
  }

  applicationAcceptanceRequested = async (): Promise<void> => {
    this.lastError = '';
    return Promise.resolve();
  }

  credentialsRequested = async (request: any): Promise<{Username: string, Password: string}> => {
    return new Promise((resolve) => {
      if (request.userAuthResult().code() === studio.protocol.AuthResultCode.eCredentialsRequired ||
          request.userAuthResult().code() === studio.protocol.AuthResultCode.eReauthenticationRequired) {
        resolve({Username: this.username, Password: this.password});
        this.lastError = '';
      } else {
        this.lastError = request.userAuthResult().text();
      }
    });
  }

  getLastError = async (timeout?: number, result?: any): Promise<any> => {
    if (timeout !== undefined && timeout <= 0) {
      return "timeout occured";
    }
    if (result !== undefined) {
      return result;
    }
    return new Promise((resolve) => setTimeout(resolve, 100))
      .then(() => Promise.resolve(this.lastError))
      .then((res: any) => this.getLastError(timeout !== undefined ? timeout - 100 : 0, res));
  }
}

export class DataSource extends DataSourceApi<CdpQuery, CdpDataSourceOptions> {
  client: any;
  notificationListener: any;
  instanceSettings: DataSourceInstanceSettings<CdpDataSourceOptions>;

  constructor(instanceSettings: DataSourceInstanceSettings<CdpDataSourceOptions>) {
    super(instanceSettings);
    this.instanceSettings = instanceSettings;
    this.notificationListener = new NotificationListener(instanceSettings)
    this.client = new studio.api.Client(instanceSettings.jsonData.url, this.notificationListener);
  }

  escapeRegExp(string: string): string {
    return string.replace(/[*.+?^${}()|[\]\\]/g, '\\$&');
  }

  async fetchChildrenPaths(query: string): Promise<string[]> {
    const parts = query.split('.');
    if (parts.length === 0) {
      return [];
    }
      
    return await parts.slice(0).reduce(async (promise: Promise<string[]>, part: string) => {
      const paths = await promise;
      const promises = paths.map(async (path: string) => {
        let newPaths: string[] = [];
        let node: any;
        if (path.length === 0) {
          node = await this.client.root();
        } else {
          node = await this.client.find(path);
        }
        node.forEachChild((child: any) => {      
          let regExp: string;
          let longName: string;
          if (path.length === 0) {
            regExp = part.replace('*', '.*');
            longName =  child.name();
          }
          else {
            regExp = this.escapeRegExp(path + '.') + part.replace('*', '.*');
            longName =  path + '.' + child.name();
          }
          const matches = longName.match(regExp);
          if (matches && !newPaths.includes(matches[0])) {
            newPaths.push(matches[0]);
          }
        });
        return newPaths;
      });
      return await Promise.all(promises).then<string[]>((paths: string[][]) => {
        return paths.flat(1);
      });
    }, Promise.resolve(['']));
  }

  async filterByModelNames(cdpPaths: string[], modelNames: string[]) {
    if (modelNames.length === 0 || modelNames.length === 0) {
      return cdpPaths;
    }
    const promises = cdpPaths.map(async (path: any) => {
      const node = await this.client.find(path);
      let matchedPath = undefined;
      for (let i = 0; i < modelNames.length; i++) {
        let regExp = modelNames[i].trim().replace('*', '.*');
        const matches = node.info().type_name.match(regExp);
        if (matches) {
          matchedPath = path;
          break;
        }
      };
      return matchedPath;
    });
    return await Promise.all(promises).then<string[]>((paths: string[]) => {
      return paths.flat(1).filter(path => !!path);
    });
  }

  async formatResult(cdpPaths: string[], removedPrefix: string[], withValues: boolean) {
    const promises = cdpPaths.map(async (path: string) => {
      let p = path;
      let result = removedPrefix.filter(s => path.startsWith(s));
      if (result.length) {
        const longestPrefixLength = Math.max(...(result.map(el => el.length)));
        p = path.slice(longestPrefixLength);
      }
      let obj = {text: p};

      if (withValues) {
        let node = await this.client.find(path);
        let value = await node.requestValue();
        obj = Object.assign(obj, { value: value });
      }
      return obj;
    });
    return await Promise.all(promises);
  }

  resolveQueryPath(query: string): string[] {
    //resolve query paths like SineApp.Sine{1,2}.{Output,Process Timer} in case Grafana variables are used
    const cdpPaths = query.split('.').reduce((result: string[], part: string) => {
      let newResult: string[] = [];
      let matches = part.match(/[^{}]+(?=})/g);
      let match = matches ? matches.join() : '';
      match.split(',').forEach((m: string) => {
        let r = part.replace('{'+match+'}', m.trim());
        if (result.length === 0) {
          newResult.push(r);
        } else {
          result.forEach((p: string) => {
            newResult.push(p.trim() + '.' + r);
          });
        }
      });
      return newResult;
    }, []);
    return cdpPaths;
  }

  getFieldType(node: any) {
    switch (node.info().value_type) {
      case studio.protocol.CDPValueType.eSTRING: {
        return FieldType.string;
      }
      case studio.protocol.CDPValueType.eBOOL: {
        return FieldType.boolean;
      }
      default: {
        return FieldType.number;
      }
    }
  }

  async metricFindQuery(query: CdpVariableQuery, options?: any): Promise<MetricFindValue[]> {
    let error = await this.testConnection();
    if (error) {
      return Promise.reject(error);
    }

    const resolvedPaths = this.resolveQueryPath(getTemplateSrv().replace(query.path, options.scopedVars));
    const resolvedPrefixes = this.resolveQueryPath(getTemplateSrv().replace(query.removedPrefix, options.scopedVars));
    const resolvedModelNames = this.resolveQueryPath(getTemplateSrv().replace(query.modelNames, options.scopedVars)).map((models: any) => {
      return models.split(';');
    }).flat(1);

    const results = resolvedPaths.map(async (path: any) => {
      const cdpPaths = await this.fetchChildrenPaths(path);
      const filteredPaths = await this.filterByModelNames(cdpPaths, resolvedModelNames);
      return await this.formatResult(filteredPaths, resolvedPrefixes, query.withValues);
    });

    const all = await Promise.all(results);
    return Promise.resolve(all.flat(1));
  }

  query(options: DataQueryRequest<CdpQuery>): Observable<DataQueryResponse> {
    let observables: Array<Observable<DataQueryResponse>> = [];
    options.targets.map((target) => {
      const query = defaults(target, CdpDefaultQuery);
      const cdpPaths = this.resolveQueryPath(getTemplateSrv().replace(query.path, options.scopedVars));
      cdpPaths.forEach((path: string) => {
        const observable = new Observable<DataQueryResponse>((subscriber) => {

          const frame = new CircularDataFrame({
            append: 'tail',
            capacity: query.capacity,
          });

          const subscriptionFn = (value: any, timestamp: any) => {
            const timeMs = Math.floor(timestamp/1000/1000);
            frame.add({ time: timeMs, value: value });
  
            subscriber.next({
              data: [frame],
              key: path,
              state: LoadingState.Streaming,
            });
          };

          this.client.find(path).then((node: any) => {
            frame.name = node.name();
            frame.refId = path;
            frame.addField({ name: 'time', type: FieldType.time });
            frame.addField({ name: 'value', type: this.getFieldType(node) });

            node.subscribeToValues(subscriptionFn, target.fs, target.sampleRate);
          });

          return () => {
            this.client.find(path).then((node: any) => {
              node.unsubscribeFromValues(subscriptionFn);
            });
          }
          
        });
        observables.push(observable);
      });
    });

    return merge(...observables);
  }

  async testConnection() {
    let listener = new NotificationListener(this.instanceSettings)
    new studio.api.Client(this.instanceSettings.jsonData.url, listener, false).root();
    return await listener.getLastError(5000);
  }

  async testDatasource() {
    const error = await this.testConnection();
    if (error.length === 0) {
      return { status: 'success', message: 'Success'};
    } else {
      return { status: 'error', message: error};
    };
  }
}
