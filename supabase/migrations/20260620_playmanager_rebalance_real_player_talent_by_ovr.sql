update public.pm_players
set talent = case
  when age < 20 and coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 80 then 11
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 88 then 10
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 84 then 9
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 80 then 8
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 76 then 7
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 72 then 6
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 68 then 5
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 64 then 4
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 60 then 3
  when coalesce(ea_fc_ovr, ovr_base, ovr_current, 0) >= 56 then 2
  else 1
end
where is_real = true;
