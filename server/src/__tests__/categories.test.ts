import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import type { Express } from 'express'

let mongod: MongoMemoryServer
let app: Express

const DEFAULT_CATEGORIES = [
  'Income',
  'Housing',
  'Food',
  'Subscriptions',
  'Entertainment',
  'Investment',
  'Transfer',
  'Miscellaneous',
]

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  app = await createApp(mongod.getUri())
})

afterAll(async () => {
  await mongod.stop()
})

afterEach(async () => {
  const { connection } = await import('mongoose')
  const collections = await connection.db?.collections()
  if (collections) {
    for (const collection of collections) {
      // Only delete non-default categories and transactions between tests —
      // defaults are seeded once and should persist across tests
      if (collection.collectionName === 'transactions') {
        await collection.deleteMany({})
      }
      if (collection.collectionName === 'categories') {
        await collection.deleteMany({ isDefault: false })
      }
      if (collection.collectionName === 'accounts') {
        await collection.deleteMany({})
      }
    }
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount() {
  const res = await request(app).post('/accounts').send({
    kind: 'Girokonto',
    name: 'Main',
    openingBalance: 100000,
    openingDate: '2026-01-01',
  })
  return res.body as { _id: string }
}

// ---------------------------------------------------------------------------
// GET /categories
// ---------------------------------------------------------------------------

describe('GET /categories', () => {
  it('returns all default categories on a fresh startup', async () => {
    const res = await request(app).get('/categories')

    expect(res.status).toBe(200)

    const names = res.body.map((c: { name: string }) => c.name)
    for (const category of DEFAULT_CATEGORIES) {
      expect(names).toContain(category)
    }
  })

  it('includes custom categories alongside defaults', async () => {
    await request(app).post('/categories').send({ name: 'Vet' })

    const res = await request(app).get('/categories')

    const names = res.body.map((c: { name: string }) => c.name)
    expect(names).toContain('Vet')
    expect(names).toContain('Food')
  })

  it('returns the same list regardless of which account is used', async () => {
    const accountA = await createAccount()
    const accountB = await request(app)
      .post('/accounts')
      .send({ kind: 'Tagesgeld', name: 'Savings', openingBalance: 0, openingDate: '2026-01-01' })

    await request(app)
      .post(`/accounts/${accountA._id}/transactions`)
      .send({ date: '2026-03-01', amount: -5000, description: 'Food', category: 'Food' })

    await request(app)
      .post(`/accounts/${accountB.body._id}/transactions`)
      .send({ date: '2026-03-01', amount: -3000, description: 'Rent', category: 'Housing' })

    const res = await request(app).get('/categories')

    const names = res.body.map((c: { name: string }) => c.name)
    expect(names).toContain('Food')
    expect(names).toContain('Housing')
  })
})

// ---------------------------------------------------------------------------
// POST /categories
// ---------------------------------------------------------------------------

describe('POST /categories', () => {
  it('creates a custom category', async () => {
    const res = await request(app).post('/categories').send({ name: 'Vet' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Vet')
    expect(res.body.isDefault).toBe(false)
    expect(res.body._id).toBeDefined()
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/categories').send({})

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// DELETE /categories/:id
// ---------------------------------------------------------------------------

describe('DELETE /categories/:id', () => {
  it('deletes a custom category with no transactions', async () => {
    const created = await request(app).post('/categories').send({ name: 'Vet' })

    const res = await request(app).delete(`/categories/${created.body._id}`)

    expect(res.status).toBe(204)

    const list = await request(app).get('/categories')
    const names = list.body.map((c: { name: string }) => c.name)
    expect(names).not.toContain('Vet')
  })

  it('is blocked for a custom category that has transactions referencing it', async () => {
    const created = await request(app).post('/categories').send({ name: 'Vet' })
    const account = await createAccount()

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-01', amount: -6425, description: 'Lassie', category: 'Vet' })

    const res = await request(app).delete(`/categories/${created.body._id}`)

    expect(res.status).toBe(409)
  })

  it('is blocked for a default category regardless of transaction count', async () => {
    const list = await request(app).get('/categories')
    const food = list.body.find((c: { name: string; isDefault: boolean }) => c.name === 'Food')

    const res = await request(app).delete(`/categories/${food._id}`)

    expect(res.status).toBe(409)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/categories/000000000000000000000000')

    expect(res.status).toBe(404)
  })
})
