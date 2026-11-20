ЗВУКИ CRITICAL STRIKE
=====================

Все звуки необязательные. Положите файл static/audio/<имя>.mp3 — и событие
зазвучит своим звуком. Нет файла — играет запасной звук (указан после «←»),
а если нет и его — тишина. Ошибок 404 не будет: сервер сам говорит игре,
какие файлы есть (после добавления файлов нажмите Reload на PythonAnywhere).

Таблица запасных звуков — SFX_FALLBACK в static/js/audio.js.


БАЗОВЫЕ (уже есть)
------------------
menu_move, menu_select, char_select, empty_click, game_start,
shoot_m4, shoot_ak47, shoot_glock, shoot_uzi, shoot_shotgun, sniper_shot, sniper_charge,
melee_swing, punch, throw, stun, door_open, tank_hit, hound_bark,
pickup_weapon, pickup_health, enemy_death, player_hurt, player_death, footstep

ОРУЖИЕ
------
shoot_m4s          M4 с глушителем (Дани)        ← shoot_m4
shoot_rpg          РПГ                           ← shoot_shotgun
shoot_flamer       огнемёт                       ← throw
shoot_minigun      миниган                       ← shoot_uzi
shoot_golden_uzi   золотой Uzi                   ← shoot_uzi
melee_bat          бита                          ← melee_swing
melee_pipe         труба                         ← melee_swing
melee_knife        нож                           ← melee_swing
melee_sword        меч                           ← melee_swing
melee_cleaver      тесак                         ← melee_swing
melee_nightstick   дубинка                       ← melee_swing
melee_spiked_bat   бита с гвоздями               ← melee_swing
fist               удар кулаком (без оружия)     ← punch
weapon_throw       бросок оружия                 ← throw
grenade_throw      бросок гранаты                ← throw
explosion          взрыв гранаты/ракеты          ← shoot_shotgun
explosion_debris   обломки после взрыва          ← tank_hit

ГЕРОИ
-----
hurt_dani, hurt_gal, hurt_daur         ранение                 ← player_hurt
death_dani, death_gal, death_daur      гибель                  ← player_death
step_dani, step_gal, step_daur         шаги                    ← footstep
armor_hit          попадание в броню             ← tank_hit
dash               рывок Галы                    ← melee_swing
dash_wall          рывок в стену                 ← punch
dash_hit           рывок сбивает врага           ← punch
clones             теневые клоны Дани            ← stun
perfect_clone      идеальный клон                ← pickup_weapon
clone_heal         идеальный клон лечит          ← pickup_health
arsenal            арсенал Даура                 ← stun
arsenal_catch      ствол прилетел в руки         ← pickup_weapon
rage_mode          ярость Даура                  ← sniper_charge
babah_ready        БАБАХ заряжен                 ← pickup_weapon
babah              БАБАХ Галы                    (нет запасного)
mode_on            другой режим героя            ← pickup_weapon
revive             героя подняли                 ← pickup_health

ПРЕДМЕТЫ
--------
pickup_grenade     граната                       ← pickup_weapon
pickup_armor       броня                         ← pickup_weapon
pickup_second      второй ствол (Даур)           ← pickup_weapon
ammo_box           ящик патронов                 ← pickup_weapon
item_take          предмет миссии                ← pickup_weapon
ally_samsa         клон подобрал самсу           ← pickup_health

ВРАГИ И БОССЫ
-------------
death_bandit, death_tank, death_hound, death_sniper   гибель врага   ← enemy_death
enemy_stun         враг оглушён                  ← stun
enemy_crawl        раненый враг стонет           ← player_hurt
boss_intro         появление босса               ← sniper_charge
boss_death         гибель босса                  ← enemy_death
boss_hit           попадание по боссу            ← tank_hit
boss_stun          босс оглушён                  ← stun
boss_second_wind   второе дыхание                ← sniper_charge
boss_swing         удар босса                    ← melee_swing
boss_roar          рык перед рывком              ← hound_bark
boss_wall_crash    босс врезался в стену         ← tank_hit
boss_spinup        раскрутка миниган-босса       ← sniper_charge
boss_minigun       очередь босса                 ← shoot_uzi
boss_windup        замах/прицеливание            ← sniper_charge
boss_shotgun       выстрел дробью                ← shoot_shotgun
boss_burst         очередь                       ← shoot_uzi
boss_slam          удар по земле                 ← tank_hit
boss_slam_blast    волна от удара                ← shoot_shotgun
boss_call          зовёт подкрепление            ← hound_bark

МИР
---
door_kick          пинок двери                   ← door_open
door_slam          дверь бьёт                    ← punch
door_break         дверь выбита                  ← door_open
door_knockdown     дверь сбила врага             ← punch
break_wood, break_metal, break_glass, break_fabric   разрушение мебели   ← door_open / tank_hit / empty_click
glass_break        разбитое окно                 ← empty_click
wave               волна врагов                  ← hound_bark
ambush             засада                        ← hound_bark
combo, combo_big   комбо и комбо ×5              (нет запасного)
level_clear        этаж зачищен                  ← game_start
victory            победа                        ← game_start
objective_done     задача миссии выполнена       ← pickup_health
lesson_done        урок обучения пройден         ← game_start
step_done          шаг обучения                  ← pickup_weapon

ИНТЕРФЕЙС И КОРПОРАТИВ
----------------------
ui_locked          закрыто                       ← empty_click
map_toggle         карта                         ← menu_move
pause              пауза                         ← menu_move
coop_pick          выбор героя в лобби           ← char_select
coop_intro         герой на заставке матча       ← char_select
ally_down          напарник упал                 ← player_death
chat, chat_system  сообщение в чате              (нет запасного)

GORILLA CUP
-----------
ball_kick          удар по мячу                  ← punch
whistle            свисток (гол, новый матч)     ← game_start
ready_on, ready_off  готов / не готов            ← menu_select / menu_move

SAMSA KOMBAT
------------
kombat_fight       «БОЙ!»                        ← game_start
kombat_whoosh      замах                         ← melee_swing
kombat_hit         удар                          ← punch
kombat_hit_heavy   тяжёлый удар                  ← tank_hit
kombat_block       блок                          ← tank_hit
kombat_land        приземление                   ← tank_hit
kombat_special     приём                         ← throw
kombat_grunt       стон бойца                    ← player_hurt
kombat_stun        оглушение                     ← stun
kombat_ko          нокаут                        ← enemy_death
fatality_whistle, fatality_punch, fatality_tank_hit, fatality_throw, fatality_player_hurt,
fatality_shoot_uzi, fatality_stun, fatality_melee_swing, fatality_player_death,
fatality_enemy_death   звуки фаталити            ← тот же звук без «fatality_»

МУЗЫКА (тоже необязательная)
----------------------------
silence.mp3                 тихая дорожка для пауз и зачистки
story/chapter1..9.mp3       музыка глав сюжета
story/blip.mp3, story/blip_<id>.mp3   голос букв в диалогах
scene/<настроение>.mp3      музыка сцен-локаций (title, home, night, roof, tension, dawn, memory)
