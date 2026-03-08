interface Props {
  privacy: 'public' | 'private'
  onChange: (privacy: 'public' | 'private') => void
  disabled?: boolean
}

export function PrivacyToggle({ privacy, onChange, disabled }: Props) {
  const isPublic = privacy === 'public'

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(isPublic ? 'private' : 'public')}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
          isPublic ? 'bg-emerald-500' : 'bg-zinc-300'
        }`}
        role="switch"
        aria-checked={isPublic}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            isPublic ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className={`text-xs font-medium ${isPublic ? 'text-emerald-600' : 'text-zinc-500'}`}>
        {isPublic ? 'Public' : 'Private'}
      </span>
    </div>
  )
}
