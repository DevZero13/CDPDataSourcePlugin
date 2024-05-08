import React, { ChangeEvent } from 'react';
import { InlineField, Input } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { CdpDataSourceOptions, CdpQuery, CdpDefaultQuery } from '../types';

type Props = QueryEditorProps<DataSource, CdpQuery, CdpDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, path: event.target.value === '' ? CdpDefaultQuery.path ?? '' : event.target.value});
    // executes the query
    onRunQuery();
  };

  const validateCapacity = (value: string) => {
    if (value === '') {
      return CdpDefaultQuery.capacity ?? 0;
    }
    const nr = parseFloat(value);
    return (nr > 1) ? nr : CdpDefaultQuery.capacity ?? 0;
  };

  const onCapacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, capacity: validateCapacity(event.target.value)});
    // executes the query
    onRunQuery();
  };

  const validateFs = (value: string) => {
    if (value === '') {
      return CdpDefaultQuery.fs ?? 0;
    }
    const nr = parseFloat(value);
    return (nr > 0) ? nr : CdpDefaultQuery.fs ?? 0;
  };
  
  const onFsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, fs: validateFs(event.target.value)});
    // executes the query
    onRunQuery();
  };

  const validateSampleRate = (value: string) => {
    if (value === '') {
      return CdpDefaultQuery.sampleRate ?? 0;
    }
    const nr = parseFloat(value);
    return (nr > 0 && nr < 1000) ? nr : CdpDefaultQuery.sampleRate ?? 0;
  };

  const onSampleRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, sampleRate: validateSampleRate(event.target.value)});
    // executes the query
    onRunQuery();
  };

  return (
    <div className="gf-form">
      <InlineField label="CDP Routing" labelWidth={16} tooltip="Path to the CDP value node to fetch the value from.">
        <Input onChange={onPathChange} value={query.path ?? CdpDefaultQuery.path} width={64} />
      </InlineField>
      <InlineField label="Fs" labelWidth={8} tooltip="Maximum frequency that value updates are expected (controls how many changes are sent in a single packet). Must be larger than zero.">
        <Input onChange={onFsChange} value={query.fs ?? CdpDefaultQuery.fs} width={8} />
      </InlineField>
      <InlineField label="Sample Rate" labelWidth={16} tooltip="Maximum amount of value updates sent per second (controls the amount of data transferred). Must be between 1 and 1000.">
        <Input onChange={onSampleRateChange} value={query.sampleRate ?? CdpDefaultQuery.sampleRate} width={8} />
      </InlineField>
      <InlineField label="Buffer Size" labelWidth={16} tooltip="Buffer size for historical data. Usually needed by different types of plots and graphing panels. Must be larger than zero.">
        <Input onChange={onCapacityChange} value={query.capacity ?? CdpDefaultQuery.capacity} width={16} />
      </InlineField>
    </div>
  );
}
