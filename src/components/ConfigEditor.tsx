import React, { ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { CdpDataSourceOptions } from '../types';
import { InlineField, Input } from '@grafana/ui';

interface Props extends DataSourcePluginOptionsEditorProps<CdpDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;

  const onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const jsonData = {
      ...options.jsonData,
      url: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const jsonData = {
      ...options.jsonData,
      username: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  const onPasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const jsonData = {
      ...options.jsonData,
      password: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  const { jsonData } = options;

  return (
    <div className="gf-form-group">
      <InlineField label="URI" labelWidth={9} tooltip="Supported schemes: HTTP (http:// or https://) and WebSocket (ws:// or wss://)">
        <Input
          value={jsonData.url || ''}
          placeholder="http://127.0.0.1:7689"
          width={30}
          onChange={onUrlChange}
        />
      </InlineField>
      <InlineField label="Username" labelWidth={9}>
        <Input
          value={jsonData.username || ''}
          width={30}
          onChange={onUsernameChange}
        />
      </InlineField>
      <InlineField label="Password" labelWidth={9}>
        <Input
          value={jsonData.password || ''}
          width={30}
          onChange={onPasswordChange}
          type={"password"}
        />
      </InlineField>
    </div>
  );
}
