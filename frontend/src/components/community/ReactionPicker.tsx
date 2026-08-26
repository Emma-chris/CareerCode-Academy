const REACTIONS = ['👍', '❤️', '🎯', '🔥', '🚀', '💡', '😂', '🙌', '✅', '⭐'];

export function ReactionPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition-colors text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
