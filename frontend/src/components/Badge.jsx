const colours = {
  low: 'bg-green-900/50 text-green-400',
  medium: 'bg-yellow-900/50 text-yellow-400',
  high: 'bg-red-900/50 text-red-400',
  todo: 'bg-slate-700 text-slate-400',
  in_progress: 'bg-blue-900/50 text-blue-400',
  done: 'bg-teal-900/50 text-teal-400',
};

export default function Badge({ label }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colours[label] ?? 'bg-slate-700 text-slate-400'}`}>
      {label.replace('_', ' ')}
    </span>
  );
}
