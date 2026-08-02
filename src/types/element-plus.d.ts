declare module 'element-plus/dist/locale/zh-cn.mjs' {
  import { Language } from 'element-plus/es/locale'
  const zhCn: Language
  export default zhCn
}

declare module 'element-plus/dist/locale/en.mjs' {
  import { Language } from 'element-plus/es/locale'
  const en: Language
  export default en
}

declare module 'http-link-header' {
  export interface Link {
    rel: string
    uri: string
    [key: string]: string
  }
  
  export interface ParsedLink {
    refs: Link[]
    get(rel: string): Link | undefined
    rel(rel: string): Link[]
    has(rel: string): boolean
  }
  
  export function parse(linkHeader: string): ParsedLink
  export function format(links: Link[]): string
  
  export default {
    parse: (_linkHeader: string) => ParsedLink
  }
}

