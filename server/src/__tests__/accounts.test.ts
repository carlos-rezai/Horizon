import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import type { Express } from 'express'

let mongod: MongoMemoryServer
let app: Express

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  app = await createApp(mongod.getUri())
})

afterAll(async () => {
  await mongod.stop()
})

afterEach(async () => {
  // Each test gets a clean DB state — drop all collections between tests
  const { connection } = await import('mongoose')
  const collections = await connection.db?.collections()
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }
})

// ---------------------------------------------------------------------------
// POST /accounts
// ---------------------------------------------------------------------------

describe('POST /accounts', () => {
  it('creates a Girokonto and returns it', async () => {
    const res = await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Main',
      openingBalance: 537685,
      openingDate: '2026-03-01',
    })

    expect(res.status).toBe(201)
    expect(res.body.kind).toBe('Girokonto')
    expect(res.body.name).toBe('Main')
    expect(res.body.openingBalance).toBe(537685)
    expect(res.body._id).toBeDefined()
  })

  it('creates two Girokontos with different names', async () => {
    await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Main',
      openingBalance: 537685,
      openingDate: '2026-03-01',
    })

    await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Sparkasse',
      openingBalance: 46000,
      openingDate: '2026-03-01',
    })

    const res = await request(app).get('/accounts')
    const names = res.body.map((a: { name: string }) => a.name)
    expect(names).toContain('Main')
    expect(names).toContain('Sparkasse')
    expect(res.body).toHaveLength(2)
  })

  it('creates a Mortgage with sondertilgungAllowance', async () => {
    const res = await request(app).post('/accounts').send({
      kind: 'Mortgage',
      name: 'Darlehen',
      openingBalance: 4009661,
      openingDate: '2026-03-01',
      sondertilgungAllowance: 650000,
    })

    expect(res.status).toBe(201)
    expect(res.body.kind).toBe('Mortgage')
    expect(res.body.sondertilgungAllowance).toBe(650000)
  })

  it('stores openingBalance as an integer (cents)', async () => {
    const res = await request(app).post('/accounts').send({
      kind: 'Tagesgeld',
      name: 'DKB Tagesgeld',
      openingBalance: 100300,
      openingDate: '2026-03-01',
    })

    expect(res.status).toBe(201)
    expect(Number.isInteger(res.body.openingBalance)).toBe(true)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/accounts').send({
      name: 'Missing kind and balance',
    })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /accounts
// ---------------------------------------------------------------------------

describe('GET /accounts', () => {
  it('returns empty array when no accounts exist', async () => {
    const res = await request(app).get('/accounts')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns all accounts with balance equal to openingBalance', async () => {
    await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Main',
      openingBalance: 537685,
      openingDate: '2026-03-01',
    })

    const res = await request(app).get('/accounts')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].balance).toBe(537685)
  })

  it('returns openingDate as an ISO string', async () => {
    await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Main',
      openingBalance: 537685,
      openingDate: '2026-03-01',
    })

    const res = await request(app).get('/accounts')

    expect(typeof res.body[0].openingDate).toBe('string')
    expect(() => new Date(res.body[0].openingDate)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// GET /accounts/:id
// ---------------------------------------------------------------------------

describe('GET /accounts/:id', () => {
  it('returns a single account by id', async () => {
    const created = await request(app).post('/accounts').send({
      kind: 'CreditCard',
      name: 'Visa',
      openingBalance: 0,
      openingDate: '2026-03-01',
    })

    const res = await request(app).get(`/accounts/${created.body._id}`)

    expect(res.status).toBe(200)
    expect(res.body._id).toBe(created.body._id)
    expect(res.body.name).toBe('Visa')
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/accounts/000000000000000000000000')

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /accounts/:id
// ---------------------------------------------------------------------------

describe('PATCH /accounts/:id', () => {
  it('updates the account name', async () => {
    const created = await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Old Name',
      openingBalance: 100000,
      openingDate: '2026-03-01',
    })

    const res = await request(app)
      .patch(`/accounts/${created.body._id}`)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Name')
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/accounts/000000000000000000000000')
      .send({ name: 'Ghost' })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// DELETE /accounts/:id
// ---------------------------------------------------------------------------

describe('DELETE /accounts/:id', () => {
  it('deletes an account with no transactions', async () => {
    const created = await request(app).post('/accounts').send({
      kind: 'Investment',
      name: 'MSCI World',
      openingBalance: 0,
      openingDate: '2026-03-01',
    })

    const res = await request(app).delete(`/accounts/${created.body._id}`)

    expect(res.status).toBe(204)

    const check = await request(app).get(`/accounts/${created.body._id}`)
    expect(check.status).toBe(404)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/accounts/000000000000000000000000')

    expect(res.status).toBe(404)
  })
})
