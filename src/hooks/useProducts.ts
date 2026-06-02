import { useState, useEffect, useCallback } from 'react'
import { listProducts, getFilterOptions } from '../services/productsService'
import type { Product, ProductFilters, ProductFilterOptions, ProductPage } from '../types/product'
import { EMPTY_FILTERS } from '../types/product'

const DEFAULT_PAGE_SIZE = 50

export function useProducts() {
  const [page, setPage]           = useState(0)
  const [pageSize, setPageSize]   = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters]     = useState<ProductFilters>(EMPTY_FILTERS)
  const [result, setResult]       = useState<ProductPage>({ data: [], total: 0, page: 0, pageSize: DEFAULT_PAGE_SIZE })
  const [loading, setLoading]     = useState(true)
  const [filterOpts, setFilterOpts] = useState<ProductFilterOptions>({
    marcas: [], linhas: [], familias: [], secoes: [], grupos: [], subgrupos: [],
  })
  const [optsLoaded, setOptsLoaded] = useState(false)

  const fetch = useCallback(async (
    f: ProductFilters = filters,
    p: number = page,
    ps: number = pageSize,
  ) => {
    setLoading(true)
    try {
      const res = await listProducts(f, p, ps)
      setResult(res)
    } catch (e) { console.error('[useProducts]', e) }
    finally { setLoading(false) }
  }, [filters, page, pageSize])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!optsLoaded) {
      getFilterOptions().then(opts => { setFilterOpts(opts); setOptsLoaded(true) })
    }
  }, [optsLoaded])

  const applyFilters = (f: ProductFilters) => {
    setFilters(f); setPage(0); fetch(f, 0, pageSize)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS); setPage(0); fetch(EMPTY_FILTERS, 0, pageSize)
  }

  const changePage = (p: number) => {
    setPage(p); fetch(filters, p, pageSize)
  }

  const changePageSize = (ps: number) => {
    setPageSize(ps); setPage(0); fetch(filters, 0, ps)
  }

  const reload = () => {
    setOptsLoaded(false)
    fetch(filters, page, pageSize)
  }

  return {
    products: result.data as Product[],
    total:    result.total,
    page,
    pageSize,
    loading,
    filters,
    filterOpts,
    applyFilters,
    resetFilters,
    changePage,
    changePageSize,
    reload,
  }
}
