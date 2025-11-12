import React from 'react';
import { useSolarSystemStore, solarSystemSelectors } from '@/stores/solarSystemStore';
interface SearchAndFilterPanelProps {
  isVisible?: boolean;
  position?: string;
  size?: string;
  onClose?: () => void;
  onResultSelect?: (result: any) => void;
  onFilterChange?: (filters: any) => void;
}
const SearchAndFilterPanel: React.FC<SearchAndFilterPanelProps> = ({
  isVisible = true,
  position = 'left',
  size = 'normal',
  onClose,
  onResultSelect,
  onFilterChange
}) => {
  const searchQuery = useSolarSystemStore(solarSystemSelectors.searchQuery);
  const activeFilters = useSolarSystemStore(solarSystemSelectors.activeFilters);
  const setSearchQuery = useSolarSystemStore(state => state.setSearchQuery);
  const setActiveFilters = useSolarSystemStore(state => state.setActiveFilters);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    const newFilters = { ...activeFilters, [name]: checked };
    setActiveFilters(newFilters);
    onFilterChange?.(newFilters);
  };
  if (!isVisible) return null;
  return (
    <div className={`absolute ${position === 'left' ? 'top-4 left-4' : 'top-4 right-4'} bg-gray-800 bg-opacity-75 p-4 rounded-lg text-white ${size === 'small' ? 'w-48' : size === 'large' ? 'w-80' : 'w-64'}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Arama & Filtreleme</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Gök cismi ara..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <h4 className="font-semibold mb-2">Kategoriler</h4>
        <div className="flex flex-col">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="planets"
              checked={activeFilters.planets}
              onChange={handleFilterChange}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded"
            />
            <span>Gezegenler</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="moons"
              checked={activeFilters.moons}
              onChange={handleFilterChange}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded"
            />
            <span>Uydular</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="dwarfPlanets"
              checked={activeFilters.dwarfPlanets}
              onChange={handleFilterChange}
              className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded"
            />
            <span>Cüce Gezegenler</span>
          </label>
        </div>
      </div>
    </div>
  );
};
export default SearchAndFilterPanel;