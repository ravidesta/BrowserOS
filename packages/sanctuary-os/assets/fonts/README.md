# Bundled typefaces

Both families are redistributed under the SIL Open Font License, Version 1.1.
Full license texts are in this directory and must travel with these files.

| Family | Role in Sanctuary OS | Copyright | License |
| --- | --- | --- | --- |
| **Cormorant Garamond** | The Narrative Voice | Copyright 2015 the Cormorant Project Authors ([CatharsisFonts/Cormorant](https://github.com/CatharsisFonts/Cormorant)) | [OFL 1.1](./OFL-CormorantGaramond.txt) |
| **Manrope** | The Structural Voice | Copyright 2018 The Manrope Project Authors ([sharanda/manrope](https://github.com/sharanda/manrope)) | [OFL 1.1](./OFL-Manrope.txt) |

Files are the `latin` and `latin-ext` variable-weight `woff2` subsets as served
by Google Fonts — Cormorant Garamond at weights 300–700 in upright and italic,
Manrope at 200–800 upright. They are bundled rather than fetched so that no
site's Content-Security-Policy can strip the typefaces out from under a page,
and so the extension makes no network requests at all.
