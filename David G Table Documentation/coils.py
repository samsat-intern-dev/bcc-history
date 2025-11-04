'''
NB: so called required coils are actually power and distribution. Hoping they can be their own districts.
98 (rpi #4):
24 = blink red main
32 = blink red 1st
40 = blink red all
48 = blink yellow all
56 = all lights on
64 = normal

PROGRAM Substation
  VAR
    BKR11 AT %QX2.0 : BOOL; (transmission 1)[transmission 1]
    BKR12 AT %QX3.0 : BOOL; (transmission 2)[transmission 2]
    BKR21 AT %QX4.0 : BOOL; (distribution)[distribution]
    BKR31 AT %QX5.0 : BOOL; (houses through theatre)[Buisness]
    BKR32 AT %QX6.0 : BOOL; (???)[hospital]
    BKR33 AT %QX7.0 : BOOL; (Stoplights)[fire/police AND Traffic light]
    BKR34 AT %QX8.0 : BOOL; (bank-Fire)[Industrial north]
    BKR35 AT %QX9.0 : BOOL; (Police)[university]
    BKR36 AT %QX10.0 : BOOL; (???)[housing district]
    TRANSON AT %IX2.0 : BOOL; 
    DISTON AT %IX2.1 : BOOL; (transmission 2)[transmission 2]*off only
    LOAD1 AT %QX0.0 : BOOL; 
    LOAD2 AT %QX0.1 : BOOL;
    LOAD2A AT %QX1.0 : BOOL;
    LOAD3 AT %QX0.2 : BOOL;
    LOAD3A AT %QX1.1 : BOOL; (transmission 1)[transmission 1]*off only
    LOAD4 AT %QX0.3 : BOOL;
    LOAD5 AT %QX0.4 : BOOL;
    LOAD6 AT %QX0.5 : BOOL;
  END_VAR

  TRANSON := BKR11 OR BKR12;
  DISTON := BKR21 AND TRANSON;
  LOAD1 := BKR31 AND DISTON;
  LOAD2 := BKR32 AND DISTON;
  LOAD2A := BKR32 AND DISTON;
  LOAD3 := BKR33 AND DISTON;
  LOAD3A := BKR33 AND DISTON;
  LOAD4 := BKR34 AND DISTON;
  LOAD5 := BKR35 AND DISTON;
  LOAD6 := BKR36 AND DISTON;
END_PROGRAM


CONFIGURATION Config0

  RESOURCE Res0 ON PLC
    TASK task0(INTERVAL := T#20ms,PRIORITY := 0);
    PROGRAM instance0 WITH task0 : Substation;
  END_RESOURCE
END_CONFIGURATION

PROGRAM PLC_2_3_4 [82 affects hospital, 83 affects police/fire][98 traffic light]
  VAR
    PWR AT %IX0.2 : BOOL := TRUE;
    RESET AT %IX0.3 : BOOL := FALSE;
    BUS AT %QX0.0 : BOOL := TRUE;
    Generator AT %QX0.1 : BOOL := FALSE;
    SW1 AT %QX2.0 : BOOL := TRUE; [main circuit breaker]
    SW2 AT %QX3.0 : BOOL := TRUE; [emergency generator]
    UPSBKR AT %QX4.0 : BOOL := TRUE; [UPS breaker]
    UPSFAULT AT %QX5.0 : BOOL := FALSE; [UPS Fault]
    DMG AT %QX6.0 : BOOL := FALSE; [Emergency gen fault]
    SHUTDOWN AT %IX2.0 : BOOL := TRUE;
    CPB AT %IX2.1 : BOOL := FALSE; [emergency generator]*off only
    DB AT %IX2.2 : BOOL := FALSE; ||
    GCB AT %IX2.3 : BOOL := FALSE; ||
    UPSDISCHARGE AT %IX2.4 : BOOL := FALSE; ||
    UPSPULSE AT %IX2.5 : BOOL := FALSE; ||
    UPSCOUNTDN AT %IX2.6 : BOOL := FALSE; ||
    UPSDEAD AT %IX2.7 : BOOL := FALSE; ||
    UPSCHARGE AT %IX3.0 : BOOL := FALSE;
    UPSPULSE2 AT %IX3.1 : BOOL := FALSE; [UPS breaker]*off only
    UPSCOUNTUP AT %IX3.2 : BOOL := FALSE; ||
    UPSON AT %IX3.3 : BOOL := TRUE;||
    UPSINIT AT %IW0 : INT := 100;
    DISCHARGE AT %IW1 : INT := 15;
    CHARGE AT %IW2 : INT := 120;
    THECOUNT AT %IW3 : INT := 0;
    PLCPCT AT %IW4 : INT := 100;
  END_VAR
  VAR
    TON0 : TON;
    TON1 : TON;
    TON2 : TON;
    TON3 : TON;
    TON4 : TON;
    TON5 : TON;
    CTU0 : CTU;
    CTU1 : CTU;
    CTUD0 : CTUD;
    R_TRIG1 : R_TRIG;
    R_TRIG2 : R_TRIG;
    LT135_ENO : BOOL;
    LT135_OUT : BOOL;
    R_TRIG3 : R_TRIG;
    R_TRIG4 : R_TRIG;
    R_TRIG5 : R_TRIG;
  END_VAR

  DB := NOT(CPB) AND NOT(GCB);
  TON0(IN := SW1 AND PWR, PT := T#15000ms);
  SHUTDOWN := TON0.Q;
  TON1(IN := SHUTDOWN, PT := T#1000ms);
  CPB := TON1.Q;
  TON2(IN := DB OR Generator, PT := T#10000ms);
  Generator := NOT(DMG) AND NOT(SHUTDOWN) AND TON2.Q;
  TON3(IN := Generator, PT := T#5000ms);
  GCB := NOT(DMG) AND SW2 AND TON3.Q;
  DMG := CPB AND GCB OR NOT(RESET) AND DMG;
  UPSON := NOT(UPSDEAD) AND NOT(UPSFAULT) AND UPSBKR;
  UPSDISCHARGE := UPSON AND DB;
  TON4(IN := NOT(UPSPULSE) AND UPSDISCHARGE, PT := T#1000ms);
  UPSPULSE := TON4.Q;
  R_TRIG2(CLK := UPSPULSE);
  CTU0(CU := R_TRIG2.Q, R := UPSCOUNTDN, PV := DISCHARGE);
  UPSCOUNTDN := CTU0.Q;
  THECOUNT := CTU0.CV;
  LT135_OUT := LT(EN := UPSON AND CPB, IN1 := PLCPCT, IN2 := 100, ENO => LT135_ENO);
  UPSCHARGE := LT135_OUT;
  TON5(IN := NOT(UPSPULSE2) AND UPSCHARGE, PT := T#1000ms);
  UPSPULSE2 := TON5.Q;
  R_TRIG3(CLK := UPSPULSE2);
  CTU1(CU := R_TRIG3.Q, R := UPSCOUNTUP, PV := CHARGE);
  UPSCOUNTUP := CTU1.Q;
  THECOUNT := CTU1.CV;
  R_TRIG4(CLK := UPSCOUNTUP);
  R_TRIG5(CLK := UPSCOUNTDN);
  R_TRIG1(CLK := TRUE);
  CTUD0(CU := R_TRIG4.Q, CD := R_TRIG5.Q, LD := R_TRIG1.Q, PV := UPSINIT);
  UPSDEAD := NOT(CPB) AND CTUD0.QD;
  PLCPCT := CTUD0.CV;
  BUS := NOT(DB) OR UPSON;
END_PROGRAM


CONFIGURATION Config0

  RESOURCE Res0 ON PLC
    TASK TaskMain(INTERVAL := T#50ms,PRIORITY := 0);
    PROGRAM Inst0 WITH TaskMain : PLC_2_3_4;
  END_RESOURCE
END_CONFIGURATION

'''