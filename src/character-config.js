// Character frame settings.
// Put 25 frame images under public/slices2/A/ by default.

export default {
  basePath: 'slices2',
  ext: 'png',
  rows: 5,
  cols: 5,
  defaultSheet: 'A',

  src(sheet, r, c) {
    return `${this.basePath}/${sheet}/r${r}c${c}.${this.ext}`;
  },
};
