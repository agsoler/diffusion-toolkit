// Missing overrides identify the stock encoder, including results made before selection existed.
export function encoderIdentity(record: { generation?: { model?: { te_name_or_path?: string } } }): string {
  return record.generation?.model?.te_name_or_path?.trim().replace(/\\/g, '/') || 'Stock encoder';
}
