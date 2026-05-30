import { useQuery } from '@tanstack/react-query';
import statesData from '@/app/data/states.json';
import districtsData from '@/app/data/districts.json';
import blocksData from '@/app/data/blocks.json';
import ulbsData from '@/app/data/ulbs.json';
import villagesData from '@/app/data/villages.json';
import gramPanchayatsData from '@/app/data/gram_panchayats.json';

export function useStates() {
  return useQuery({
    queryKey: ['states'],
    queryFn: () => statesData,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useDistricts(stateId: number | null) {
  return useQuery({
    queryKey: ['districts' + stateId],
    queryFn: () => districtsData.filter(d => d.state_lgd_code === stateId),
    enabled: stateId != null && stateId > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useBlocks(districtId: number | null) {
  return useQuery({
    queryKey: ['blocks' + districtId],
    queryFn: () => blocksData.filter(b => b.district_lgd_code === districtId),
    enabled: districtId != null && districtId > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useUlbs(districtId: number | null) {
  return useQuery({
    queryKey: ['ulbs' + districtId],
    queryFn: () => ulbsData.filter(u => u.district_lgd_code === districtId),
    enabled: districtId != null && districtId > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useVillages(blockId: number | null) {
  return useQuery({
    queryKey: ['villages' + blockId],
    queryFn: () => villagesData.filter(v => v.block_lgd_code === blockId),
    enabled: blockId != null && blockId > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useGramPanchayats(blockId: number | null) {
  return useQuery({
    queryKey: ['gramPanchayats' + blockId],
    queryFn: () => gramPanchayatsData.filter(g => g.block_lgd_code === blockId),
    enabled: blockId != null && blockId > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
