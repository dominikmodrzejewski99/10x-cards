import { TextParserService } from './text-parser.service';

describe('TextParserService', () => {
  let service: TextParserService;

  beforeEach(() => {
    service = new TextParserService();
  });

  it('should parse tab-separated lines', () => {
    const input = 'front1\tback1\nfront2\tback2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.proposals[0]).toEqual({ front: 'front1', back: 'back1', source: 'manual' });
    expect(result.proposals[1]).toEqual({ front: 'front2', back: 'back2', source: 'manual' });
    expect(result.errors.length).toBe(0);
  });

  it('should parse comma-separated lines when no tab present', () => {
    const input = 'front1,back1\nfront2,back2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.proposals[0]).toEqual({ front: 'front1', back: 'back1', source: 'manual' });
  });

  it('should split on first comma only (back can contain commas)', () => {
    const input = 'word,definition with, extra commas';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].front).toBe('word');
    expect(result.proposals[0].back).toBe('definition with, extra commas');
  });

  it('should prefer tab over comma', () => {
    const input = 'front,part\tback,part';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front,part');
    expect(result.proposals[0].back).toBe('back,part');
  });

  it('should skip empty lines', () => {
    const input = 'front1\tback1\n\n\nfront2\tback2\n';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it('should report lines without separator as errors', () => {
    const input = 'front1\tback1\nno separator here\nfront2\tback2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].content).toBe('no separator here');
  });

  it('should trim whitespace from front and back', () => {
    const input = '  front1  \t  back1  ';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front1');
    expect(result.proposals[0].back).toBe('back1');
  });

  it('should report error for lines where front or back is empty after trim', () => {
    const input = '\tback1\nfront1\t';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(0);
    expect(result.errors.length).toBe(2);
  });

  it('should return empty result for empty string', () => {
    const result = service.parseKeyValue('');
    expect(result.proposals.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle \\r\\n line endings', () => {
    const input = 'front1\tback1\r\nfront2\tback2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
  });

  it('should report error for whitespace-only values with tab separator', () => {
    const input = '   \t   ';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should split on first tab when line has multiple tabs', () => {
    const input = 'front\tmiddle\tback';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front');
    expect(result.proposals[0].back).toBe('middle\tback');
  });

  it('should handle single line without trailing newline', () => {
    const input = 'front\tback';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(1);
  });

  it('should parse semicolon-separated lines', () => {
    const input = 'apple;jabłko\ndog;pies';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.proposals[0]).toEqual({ front: 'apple', back: 'jabłko', source: 'manual' });
    expect(result.proposals[1]).toEqual({ front: 'dog', back: 'pies', source: 'manual' });
  });

  it('should split on first semicolon only (back can contain semicolons)', () => {
    const input = 'word;definition with; extra semicolons';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('word');
    expect(result.proposals[0].back).toBe('definition with; extra semicolons');
  });

  it('should prefer tab over semicolon', () => {
    const input = 'front;part\tback;part';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front;part');
    expect(result.proposals[0].back).toBe('back;part');
  });

  it('should prefer semicolon over comma', () => {
    const input = 'front,part;back,part';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front,part');
    expect(result.proposals[0].back).toBe('back,part');
  });
});
