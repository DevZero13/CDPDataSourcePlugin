import React, { useState } from 'react';
import { CdpVariableQuery, CdpDefaultVariableQuery } from './../types';
import { InlineField, Input, InlineSwitch } from '@grafana/ui';

interface VariableQueryProps {
  query: CdpVariableQuery;
  onChange: (query: CdpVariableQuery, definition: string) => void;
}

export const VariableQueryEditor: React.FC<VariableQueryProps> = ({ onChange, query }) => {
  const [state, setState] = useState({...CdpDefaultVariableQuery, ...query});

  const saveQuery = () => {
    onChange(state, `${state.modelNames} (${state.path})`);
  };

  const handleChange = (event: React.FormEvent<HTMLInputElement>) =>
    setState({
      ...state,
      [event.currentTarget.name]: event.currentTarget.value,
    });

  const handleSwitchChange = (event: React.FormEvent<HTMLInputElement>) =>
    setState({
      ...state,
      [event.currentTarget.name]: event.currentTarget.checked,
    });

  return (
    <div className="gf-form-group">
      <InlineField label="Node Path" labelWidth={16} tooltip="CDP node path to search for children">
        <Input
          name="path"
          value={state.path}
          width={47}
          onChange={handleChange}
          onBlur={saveQuery}
          placeholder="AppName.CompName.*"
        />
      </InlineField>
      <InlineField label="Model Name" labelWidth={16} tooltip="Optional, filter results by CDP node model names">
        <Input
          name="modelNames"
          value={state.modelNames}
          width={47}
          onChange={handleChange}
          onBlur={saveQuery}
          placeholder="CDPParameter;CDPSignal*"
        />
      </InlineField>
      <InlineField label="Remove Prefix" labelWidth={16} tooltip="Optional, remove prefix from results">
        <Input
          name="removedPrefix"
          value={state.removedPrefix}
          width={47}
          onChange={handleChange}
          onBlur={saveQuery}
          placeholder="AppName.CompName."
        />
      </InlineField>
      <InlineField label="Values" labelWidth={16} tooltip="Either return list of node names, or map of names and values">
        <InlineSwitch
          name="withValues"
          value={state.withValues}
          onChange={handleSwitchChange}
          onBlur={saveQuery}
        />
      </InlineField>
    </div>
  );
};
