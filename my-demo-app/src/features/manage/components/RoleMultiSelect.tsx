import { MultiSelect } from "@mantine/core";

type Props = {
  label?: string;
  data: { label: string; value: string }[];
  value: string[];
  onChange: (v: string[]) => void;
};

export default function RoleMultiSelect({ label = "Roles", data, value, onChange }: Props) {
  return (
    <MultiSelect
      label={label}
      data={data}
      value={value}
      onChange={onChange}
      placeholder="Select roles"
      styles={{ label: { marginBottom: 8 } }}
    />
  );
}
