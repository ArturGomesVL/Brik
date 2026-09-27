import { createContext } from 'react'

// true nas telas que estão dentro do Layout, ou seja, que no desktop têm a
// TopBar em cima. Lá a logo já aparece na TopBar, e o BrandHeader usa isto
// para não repeti-la (ver BrandHeader.jsx).
export const ComTopBar = createContext(false)
