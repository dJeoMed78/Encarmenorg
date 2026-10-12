import React, { useState } from 'react';
import { MapPin, Search, ChevronRight, Building2, ExternalLink } from 'lucide-react';
import { Business } from '../types';

interface CityZoneExplorerProps {
  businesses: Business[];
  onSelectBusiness: (business: Business) => void;
  onFilterByColonia: (colonia: string) => void;
}

export const CityZoneExplorer: React.FC<CityZoneExplorerProps> = ({
  businesses,
  onSelectBusiness,
  onFilterByColonia
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Group businesses by colonia
  const coloniasMap: Record<string, Business[]> = {};
  for (const b of businesses) {
    const col = b.colonia?.trim() || 'Ciudad del Carmen Centro';
    if (!coloniasMap[col]) coloniasMap[col] = [];
    coloniasMap[col].push(b);
  }

  const coloniasList = Object.entries(coloniasMap)
    .map(([name, items]) => ({
      name,
      count: items.length,
      items
    }))
    .sort((a, b) => b.count - a.count);

  const filteredColonias = coloniasList.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentZone =
    selectedZone === 'all'
      ? { name: 'Toda Ciudad del Carmen', items: businesses }
      : coloniasList.find(c => c.name === selectedZone) || { name: selectedZone, items: [] };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl sm:rounded-3xl p-5 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden sm:flex items-center justify-center">
          <MapPin className="w-80 h-80 -mr-16" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            <span>Explorador Geográfico · Ciudad del Carmen</span>
          </div>
          <h2 className="text-xl sm:text-4xl font-extrabold tracking-tight">
            Negocios por Colonia y Zona Urbana
          </h2>
          <p className="text-amber-100 text-xs sm:text-base leading-relaxed">
            Localiza proveedores, talleres y comercios cercanos a tu colonia en Ciudad del Carmen.
            Consulta su dirección exacta o navega en un clic con Google Maps.
          </p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Colonias List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h3 className="font-bold text-sm text-stone-900">Colonias y Fraccionamientos</h3>
            <span className="text-xs text-stone-500">{coloniasList.length} zonas</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar colonia..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-amber-500 text-stone-800"
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedZone('all')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                selectedZone === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'hover:bg-stone-100 text-stone-700'
              }`}
            >
              <span>Todas las zonas</span>
              <span className="text-xs opacity-75">{businesses.length}</span>
            </button>

            {filteredColonias.map(c => {
              const isSelected = selectedZone === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedZone(c.name)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Zone Businesses */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200">
            <div>
              <h3 className="font-extrabold text-lg text-stone-900">{currentZone.name}</h3>
              <p className="text-xs text-stone-500">
                {currentZone.items.length} negocios encontrados en este sector
              </p>
            </div>
            {selectedZone !== 'all' && (
              <button
                onClick={() => onFilterByColonia(selectedZone)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Ver en vista principal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {currentZone.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
              <Building2 className="w-12 h-12 mx-auto stroke-[1.2]" />
              <p className="font-medium text-stone-600">
                No hay negocios registrados con dirección en esta colonia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentZone.items.map(b => (
                <div
                  key={b.id}
                  onClick={() => onSelectBusiness(b)}
                  className="group bg-white rounded-2xl border border-stone-200 p-4 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span className="font-semibold text-amber-600 truncate">
                        {b.categories?.[0] || 'Comercio local'}
                      </span>
                      {b.phone && <span className="font-mono text-stone-600">{b.phone}</span>}
                    </div>
                    <h4 className="font-bold text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                      {b.name}
                    </h4>
                    <p className="text-xs text-stone-600 line-clamp-2">
                      {b.address || b.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-500 text-[11px] truncate">{b.colonia}</span>
                    {b.mapsUrl ? (
                      <a
                        href={b.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Google Maps</span>
                      </a>
                    ) : (
                      <span className="text-amber-600 font-medium group-hover:underline">
                        Ver ficha
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
