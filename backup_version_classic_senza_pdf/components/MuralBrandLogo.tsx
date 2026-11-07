import React from 'react';

interface MuralBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showIcons?: boolean;
}

export const MuralBrandLogo: React.FC<MuralBrandLogoProps> = ({ 
  size = 'md', 
  showTagline = true,
  showIcons = true
}) => {
  return (
    <div className="flex items-center space-x-3 select-none">
      {/* Brand Emblem */}
      <div className="relative group shrink-0">
        <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shadow-sm">
          <span className="font-outfit font-black text-xl sm:text-2xl text-amber-400 tracking-tight leading-none inline-block">
            M&amp;S
          </span>
        </div>
      </div>

      {/* Brand title and subtitle */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="font-outfit text-base sm:text-lg text-white font-bold tracking-tight">
            TAKE A MANAGEMENT
          </span>

          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            H24 Store
          </span>
        </div>

        {showTagline && (
          <div className="flex items-center space-x-2 text-2xs text-stone-400">
            <span className="text-stone-300 font-medium">Gestionale Negozio H24</span>
            {showIcons && (
              <>
                <span className="text-stone-600">•</span>
                <span className="inline-flex items-center space-x-1.5 text-stone-400">
                  <span>☕ Caffè</span>
                  <span className="text-stone-600">•</span>
                  <span>🍪 Snack</span>
                  <span className="text-stone-600">•</span>
                  <span>🥤 Bevande</span>
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
