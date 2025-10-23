import React from 'react'
import './Dropdown.css'

type Props = {
  value: string
  onChange: (v: string) => void
  options: string[]
}

const Dropdown: React.FC<Props> = ({ value, onChange, options }) => (
  <select
    className="dropdown"
    value={value}
    onChange={e => onChange(e.target.value)}
  >
    {options.map(o => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
)

export default React.memo(Dropdown)
