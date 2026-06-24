import type { AliasMap } from "../../types";

interface AliasEditorProps {
  columnas: string[];
  aliases: AliasMap;
  onChange: (aliases: AliasMap) => void;
}

export function AliasEditor({ columnas, aliases, onChange }: AliasEditorProps) {
  const handleChange = (columna: string, value: string) => {
    onChange({ ...aliases, [columna]: value });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Alias de columnas
      </label>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Columna
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">
                Alias
              </th>
            </tr>
          </thead>
          <tbody>
            {columnas.map((col) => (
              <tr key={col} className="border-t border-gray-100">
                <td className="px-3 py-1.5 text-gray-700 font-mono text-xs">
                  {col}
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={aliases[col] ?? ""}
                    onChange={(e) => handleChange(col, e.target.value)}
                    placeholder="(sin alias)"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
