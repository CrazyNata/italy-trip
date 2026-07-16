# Pet-Friendly Restaurants Research

## Baseline

- Read `public.trip_state.main` at `2026-07-15 18:24:51.135254+00`.
- 101 current restaurant records were checked, including bars and cafes.
- `no confirmation` means that no explicit dog/pet acceptance was found; it is not a prohibition.
- The stored Google Maps link for each record was used as the baseline source. Official pages, Google Maps data, pet-friendly directories, and accessible visitor reviews were additionally checked where available.

## Confirmed Pet-Friendly

| ID | City | Name | Source type | Source URL | Evidence |
| --- | --- | --- | --- | --- | --- |
| `r_verona_berbere` | Верона, Италия | Berberè Verona | Official | https://www.berberepizza.it/faq/ | Official FAQ: “Posso portare il mio cane? Assolutamente sì! Accettiamo cani senza problemi.” |
| `r_milan_trattoria_milanese` | Милан, Италия | Trattoria Milanese | Visitor review | https://www.petitfute.co.uk/v50174-milan/c1165-restaurants/c1031-cuisines-du-monde/c1036-cuisine-mediterraneenne/c82-restaurant-italien/380289-trattoria-milanese.html | Visitor review says “avvisare se si ha il cane”, indicating that a guest should notify the venue when bringing a dog. |

## No Confirmation

The following IDs were checked without finding explicit dog/pet acceptance. Their `petFriendly` property remains absent.

The exact Google Maps source URL for every listed ID is the live `link` field returned by this baseline audit query:

```sql
select item->>'id' as id, item->>'link' as source_url
from public.trip_state
cross join lateral jsonb_array_elements(payload->'data'->'restaurants') item
where trip_state.id = 'main'
order by id;
```

| City | IDs |
| --- | --- |
| Рим, Италия | `r_rome_armando_pantheon`, `r_rome_la_licata`, `r_pigneto_berbere`, `r_pigneto_bosco_tartufo`, `r_rome_da_enzo_29`, `bar_rome_drink_kong`, `r_rome_eden_pistacchio`, `r_rome_fatamorgana_monti`, `r_rome_felice_testaccio`, `bar_rome_freni_e_frizioni`, `r_rome_gracchi`, `r_rome_giolitti`, `r_pigneto_mimi_coco`, `bar_rome_il_goccetto`, `bar_rome_la_punta`, `bar_rome_ma_che_siete`, `r_pigneto_necci`, `r_pigneto_pinseria`, `r_rome_roscioli`, `r_rome_santeustachio`, `r_pigneto_trattoria` |
| Милан, Италия | `r_milan_matarel`, `r_milan_vecchio_aratro`, `bar_milan_bar_basso`, `bar_milan_camparino`, `bar_milan_cantine_isola`, `r_milan_el_brellin`, `r_milan_gino_sorbillo`, `r_milan_prosciutteria`, `bar_milan_lambrate_golgi`, `r_milan_treno`, `r_milan_luini`, `r_milan_piz`, `r_milan_spontini_melzo`, `r_milan_ravioleria_sarpi`, `bar_milan_rita`, `r_milan_da_abele`, `r_milan_madonnina`, `r_milan_masuelli` |
| Мюнхен, Германия | `r_muc_andechser`, `r_muc_augustiner_keller`, `r_muc_ayinger`, `bar_munich_gabanyi`, `r_muc_pschorr`, `bar_munich_frisches_bier`, `r_muc_hofbrauhaus`, `r_muc_ratskeller`, `r_muc_spatenhaus`, `bar_munich_trisoux`, `r_muc_weisses`, `r_muc_wirtshaus_au`, `bar_munich_zephyr`, `r_muc_franziskaner`, `bar_munich_zum_wolf` |
| Верона, Италия | `r_verona_bottega`, `bar_verona_archivio`, `r_verona_borsari`, `r_verona_perbellini`, `bar_verona_grande_giove`, `r_verona_desco`, `r_verona_tradision`, `bar_verona_carega`, `r_verona_bugiardo`, `r_verona_sottocosta`, `bar_verona_santa_maria`, `bar_verona_mr_martini`, `r_verona_pompiere` |
| кьоджа, Италия | `r_chioggia_baia_porci`, `bar_chioggia_le_sirene`, `bar_chioggia_vecio_orelogio`, `r_chioggia_bar_riva_vena`, `r_chioggia_vittoria`, `r_chioggia_modena`, `r_chioggia_el_gato`, `bar_chioggia_baruffino`, `bar_chioggia_officina_alcolica`, `r_chioggia_oronero`, `r_chioggia_teatro`, `r_chioggia_fronte_porto`, `r_chioggia_penzo`, `r_mrhvdvsp_i5tn`, `r_chioggia_riva_vena`, `bar_chioggia_wine_bellini` |
| Фильине-Вальдарно, Италия | `bar_figline_barcollo`, `bar_figline_binario_5`, `bar_figline_caffe_teatro`, `bar_figline_caffe_palace`, `r_figline_casa_mema`, `bar_figline_nuovo_remo`, `r_figline_de_medici`, `r_figline_osteria_vinicolo`, `r_figline_perlamora`, `r_figline_tramaglino` |
| Кастель-Гандольфо, Италия | `bar_castel_al_bar_etto`, `r_castelgandolfo_pagnanelli`, `bar_castel_baruffa`, `bar_castel_birrodrome`, `bar_castel_i_quadri`, `bar_castel_tortuga` |

## Persistence Verification

- Saved two confirmed flags at `2026-07-16 08:23:23.001484+00`; removed the unsupported Masuelli flag at `2026-07-16 08:25:56.143076+00`.
- Restaurant count remained 101.
- Only `r_verona_berbere` and `r_milan_trattoria_milanese` have `petFriendly: true`.
