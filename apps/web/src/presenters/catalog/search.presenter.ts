import {
  searchKeys,
  type SearchLocation,
  type SearchNavigation,
} from '../../models/reports/search-location.js'
import { toReportQuery } from '../../models/reports/filters.js'
import type { CatalogPresenter } from './catalog.presenter.js'
import { toReportFilters, type FiltersPresenter } from './filters.presenter.js'

interface Dependencies {
  filters: FiltersPresenter
  catalog: Pick<CatalogPresenter, 'load' | 'cancel'>
  navigation: SearchNavigation
  onSearch: () => void
}

export class CatalogSearchPresenter {
  private generation = 0
  private restoring = false
  constructor(private readonly dependencies: Dependencies) {}

  start = () => {
    const { filters, navigation, catalog } = this.dependencies
    const stopFilters = filters.subscribe(this.selectionChanged)
    const stopNavigation = navigation.onChange(this.followLocation)
    const location = navigation.current()
    if (location) this.restore(location)
    const generation = ++this.generation
    // A discarded React lifecycle must not send an initial request of its own.
    void Promise.resolve().then(() => {
      if (generation === this.generation) this.load()
    })
    return () => {
      this.generation++
      stopFilters()
      stopNavigation()
      catalog.cancel()
    }
  }

  private load = () => {
    this.generation++
    void this.dependencies.catalog.load(this.dependencies.filters.getSnapshot())
  }

  private restore(location: SearchLocation) {
    const { filters, navigation, onSearch } = this.dependencies
    this.restoring = true
    try {
      filters.restore(location.query, location.invalid)
    } finally {
      this.restoring = false
    }
    if (!location.invalid) navigation.replace(location.query)
    if (Object.keys(location.query).length || location.invalid) onSearch()
  }

  private followLocation = (location: SearchLocation | undefined) => {
    if (!location) return
    const selection = this.dependencies.filters.getSnapshot()
    const query = toReportQuery(toReportFilters(selection))
    if (
      !selection.dateFromInvalidInput &&
      !selection.dateToInvalidInput &&
      location.invalid === Boolean(selection.urlError) &&
      searchKeys.every((key) => query[key] === location.query[key])
    )
      return // The current section and its results stay in place on return from a detail.
    this.restore(location)
    this.load()
  }

  private selectionChanged = () => {
    if (this.restoring) return
    const { filters, navigation } = this.dependencies
    navigation.replace(toReportQuery(toReportFilters(filters.getSnapshot())))
    this.load()
  }
}
