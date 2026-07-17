import { buildPublicUrl } from './public-url';

describe('buildPublicUrl', () => {
  it.each([
    ['avatar/resized/user-small.jpg', 'https://api.example.com'],
    ['/avatar/resized/user-small.jpg', 'https://api.example.com/'],
    ['/uploads/avatar/resized/user-small.jpg', 'https://api.example.com///'],
  ])('normalizes media path %s and base URL', (path, baseUrl) => {
    expect(buildPublicUrl(path, baseUrl)).toBe(
      'https://api.example.com/uploads/avatar/resized/user-small.jpg',
    );
  });

  it.each(['', '   ', '../private.txt', 'https://evil.example/file.jpg'])(
    'rejects unsafe media path %s',
    (path) => {
      expect(() => buildPublicUrl(path, 'https://api.example.com')).toThrow(
        'media path',
      );
    },
  );

  it.each(['not-a-url', 'file:///tmp/uploads'])(
    'rejects base URL %s',
    (baseUrl) => {
      expect(() => buildPublicUrl('image.jpg', baseUrl)).toThrow('base URL');
    },
  );
});
