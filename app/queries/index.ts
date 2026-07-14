import { useQuery } from '@tanstack/react-query';
import countries from '@/app/data/location/countries.json';
import states from '@/app/data/location/states.json';
import cities from '@/app/data/location/cities.json';

export function useCountries(isEnabled = false) {
  return useQuery({
    queryKey: ['countries'],
    queryFn: () => Array.isArray(countries) ? countries : [],
    enabled: isEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useStates(parent?: string) {
  return useQuery({
    queryKey: ['states', parent],
    queryFn: () => Array.isArray(states) ? states.filter(item => item.parent === parent) : [],
    enabled: !!parent,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useCities(parent?: string) {
  return useQuery({
    queryKey: ['cities', parent],
    queryFn: () => Array.isArray(cities) ? cities.filter(item => item.parent === parent) : [],
    enabled: !!parent,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
