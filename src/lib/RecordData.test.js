import { describe, it, expect } from 'vitest';
import {
  PHASE_CONFIG,
  classifyAndValidateImport,
  mergeRecordData,
  convertRecordDataJSONToTSV,
  convertRecordDataTSVToJSON,
} from './RecordData.js';

// ── Fixtures ──────────────────────────────────────────────────────

const MATCH = {
  scouterName:    'Alice',
  matchNumber:    3,
  teamNumber:     1234,
  robotPosition:  'Red Top',
  fuelMissedAuto: 1,
  autoPoints:     10,
  autoClimb:      false,
  cycles:         4,
  numberDepot:    2,
  intakeType:     'Over Bumper',
  endgameClimb:   'L2',
  superChargedRP: false,
  chargedRP:      true,
  climbRP:        false,
  yellowCard:     false,
  brokeDown:      false,
  minorFouls:     1,
  majorFouls:     0,
  playstyle:      'Offense',
  redScore:       55,
  blueScore:      40,
  result:         'Win',
  observations:   'Good match',
};

const PIT = {
  scouterName:     'Bob',
  teamNumber:      5678,
  weight:          110,
  drivetrain:      'Swerve',
  hasAutoAlign:    true,
  autoDescription: 'Shoots 3 notes',
  hopperCapacity:  5,
  shooterSpeed:    80,
  intakeSpeed:     60,
  supportedPaths:  'Trench',
  climbLevel:      'L3',
  climbType:       'Side',
  robotLength:     28,
  robotHeight:     22,
  robotWidth:      26,
};

// ── classifyAndValidateImport ─────────────────────────────────────

describe('classifyAndValidateImport', () => {
  it('rejects non-array input', () => {
    const result = classifyAndValidateImport({ not: 'an array' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/array/i);
  });

  it('rejects empty array', () => {
    const result = classifyAndValidateImport([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/empty/i);
  });

  it('rejects non-object rows', () => {
    const result = classifyAndValidateImport(['not an object']);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/row 1/i);
  });

  it('accepts a valid match record', () => {
    const result = classifyAndValidateImport([MATCH]);
    expect(result.valid).toBe(true);
    expect(result.byPhase.Match).toHaveLength(1);
    expect(result.byPhase.Pit).toHaveLength(0);
  });

  it('accepts a valid pit record', () => {
    const result = classifyAndValidateImport([PIT]);
    expect(result.valid).toBe(true);
    expect(result.byPhase.Pit).toHaveLength(1);
    expect(result.byPhase.Match).toHaveLength(0);
  });

  it('accepts a mixed array of match and pit records', () => {
    const result = classifyAndValidateImport([MATCH, PIT]);
    expect(result.valid).toBe(true);
    expect(result.byPhase.Match).toHaveLength(1);
    expect(result.byPhase.Pit).toHaveLength(1);
  });

  it('rejects a record with a missing key', () => {
    const { scouterName: _, ...noScouter } = MATCH;
    const result = classifyAndValidateImport([noScouter]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/scouterName/);
  });

  it('rejects a record with an extra key', () => {
    const result = classifyAndValidateImport([{ ...MATCH, unknownField: 'oops' }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/unknownField/);
  });

  it('rejects a record where a number field is a string', () => {
    const result = classifyAndValidateImport([{ ...MATCH, matchNumber: '3' }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/matchNumber/);
  });

  it('rejects a record where a boolean field is a number', () => {
    const result = classifyAndValidateImport([{ ...MATCH, autoClimb: 1 }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/autoClimb/);
  });
});

// ── mergeRecordData ───────────────────────────────────────────────

describe('mergeRecordData', () => {
  const match = PHASE_CONFIG.Match;
  const pit   = PHASE_CONFIG.Pit;

  it('adds new match records to an empty store', () => {
    const result = mergeRecordData(match, [], [MATCH]);
    expect(result).toHaveLength(1);
    expect(result[0].teamNumber).toBe(1234);
  });

  it('merges without duplicating records with distinct keys', () => {
    const second = { ...MATCH, matchNumber: 5, teamNumber: 9999 };
    const result = mergeRecordData(match, [MATCH], [second]);
    expect(result).toHaveLength(2);
  });

  it('overwrites an existing match record with the same key', () => {
    const updated = { ...MATCH, observations: 'Updated notes' };
    const result = mergeRecordData(match, [MATCH], [updated]);
    expect(result).toHaveLength(1);
    expect(result[0].observations).toBe('Updated notes');
  });

  it('sorts match records by matchNumber ascending', () => {
    const early = { ...MATCH, matchNumber: 1 };
    const late  = { ...MATCH, matchNumber: 10, teamNumber: 9999 };
    const result = mergeRecordData(match, [late], [early]);
    expect(result[0].matchNumber).toBe(1);
    expect(result[1].matchNumber).toBe(10);
  });

  it('sorts match records by robotPosition when matchNumber ties', () => {
    const blue = { ...MATCH, teamNumber: 1111, robotPosition: 'Blue Top' };
    const red  = { ...MATCH, teamNumber: 2222, robotPosition: 'Red Top' };
    const result = mergeRecordData(match, [red], [blue]);
    expect(result[0].robotPosition).toBe('Blue Top');
    expect(result[1].robotPosition).toBe('Red Top');
  });

  it('overwrites an existing pit record with the same team number', () => {
    const updated = { ...PIT, weight: 130 };
    const result = mergeRecordData(pit, [PIT], [updated]);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(130);
  });

  it('sorts pit records by teamNumber ascending', () => {
    const low  = { ...PIT, teamNumber: 100 };
    const high = { ...PIT, teamNumber: 9000 };
    const result = mergeRecordData(pit, [high], [low]);
    expect(result[0].teamNumber).toBe(100);
    expect(result[1].teamNumber).toBe(9000);
  });
});

// ── TSV round-trip ────────────────────────────────────────────────

describe('convertRecordDataJSONToTSV / convertRecordDataTSVToJSON', () => {
  it('produces a header row matching the column keys', () => {
    const tsv    = convertRecordDataJSONToTSV(PHASE_CONFIG.Match, [MATCH]);
    const header = tsv.split('\n')[0];
    const keys   = PHASE_CONFIG.Match.columns.map(c => c.key);
    expect(header).toBe(keys.join('\t'));
  });

  it('serialises boolean fields as Yes / No', () => {
    const tsv  = convertRecordDataJSONToTSV(PHASE_CONFIG.Match, [MATCH]);
    const row  = tsv.split('\n')[1].split('\t');
    const keys = PHASE_CONFIG.Match.columns.map(c => c.key);
    const autoClimbVal = row[keys.indexOf('autoClimb')];
    const chargedRPVal = row[keys.indexOf('chargedRP')];
    expect(autoClimbVal).toBe('No');
    expect(chargedRPVal).toBe('Yes');
  });

  it('round-trips a match record through TSV without data loss', () => {
    const tsv    = convertRecordDataJSONToTSV(PHASE_CONFIG.Match, [MATCH]);
    const parsed = convertRecordDataTSVToJSON(tsv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(MATCH);
  });

  it('round-trips a pit record through TSV without data loss', () => {
    const tsv    = convertRecordDataJSONToTSV(PHASE_CONFIG.Pit, [PIT]);
    const parsed = convertRecordDataTSVToJSON(tsv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(PIT);
  });

  it('round-trips multiple records preserving order', () => {
    const second = { ...MATCH, matchNumber: 7, teamNumber: 4321 };
    const tsv    = convertRecordDataJSONToTSV(PHASE_CONFIG.Match, [MATCH, second]);
    const parsed = convertRecordDataTSVToJSON(tsv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].matchNumber).toBe(3);
    expect(parsed[1].matchNumber).toBe(7);
  });
});
