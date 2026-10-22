import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { ReportSummary } from '@perdiu/contracts'
import { selectOwnReports } from '../../src/models/reports/own-reports.js'

test('la selección propia exige identidad incluso con nombres iguales y conserva el tipo al filtrar', () => {
  const base = {
    title: 'Mochila de prueba',
    description: 'Descripción ficticia para el test.',
    category: 'object' as const,
    city: 'La Paz',
    zone: 'Centro',
    incidentDate: '2026-10-20',
    createdAt: '2026-10-20T12:00:00Z',
    imageUrls: [],
  }
  const reports: ReportSummary[] = [
    {
      ...base,
      id: 'own',
      state: 'resolved',
      type: 'found',
      author: { id: 'owner-1', displayName: 'Mismo Nombre' },
    },
    {
      ...base,
      id: 'other',
      state: 'resolved',
      type: 'found',
      author: { id: 'owner-2', displayName: 'Mismo Nombre' },
    },
  ]
  assert.deepEqual(selectOwnReports(reports, 'owner-1', 'resolved'), [reports[0]])
  assert.deepEqual(selectOwnReports(reports, 'owner-1', 'active'), [])
  assert.deepEqual(selectOwnReports(reports, null), [])
})
