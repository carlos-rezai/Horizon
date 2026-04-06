import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import type { Express } from 'express'

let mongod: MongoMemoryServer
let app: Express

// A valid ObjectId that doesn't need to exist in the DB for CRUD tests
const FAKE_ACCOUNT_ID = '000000000000000000000001'

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
      await collection.deleteMany({})
    }
  }
})

// ---------------------------------------------------------------------------
// POST /recurring-transactions
// ---------------------------------------------------------------------------

describe('POST /recurring-transactions', () => {
  it('creates a standing order and returns 201 with all fields including accountId', async () => {
    const res = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })

    expect(res.status).toBe(201)
    expect(res.body._id).toBeDefined()
    expect(res.body.accountId).toBe(FAKE_ACCOUNT_ID)
    expect(res.body.amount).toBe(95000)
    expect(res.body.description).toBe('Rent')
    expect(res.body.category).toBe('Housing')
    expect(res.body.frequency).toBe('monthly')
    expect(res.body.dayOfMonth).toBe(1)
    expect(res.body.isActive).toBe(true)
  })

  it('stores and returns linkedAccountId for a recurring transfer', async () => {
    const sourceRes = await request(app).post('/accounts').send({
      kind: 'Girokonto',
      name: 'Main',
      openingBalance: 0,
      openingDate: '2026-01-01',
    })
    const destRes = await request(app).post('/accounts').send({
      kind: 'Tagesgeld',
      name: 'Savings',
      openingBalance: 0,
      openingDate: '2026-01-01',
    })

    const res = await request(app).post('/recurring-transactions').send({
      accountId: sourceRes.body._id,
      amount: 50000,
      description: 'Monthly savings transfer',
      category: 'Transfer',
      frequency: 'monthly',
      dayOfMonth: 5,
      linkedAccountId: destRes.body._id,
    })

    expect(res.status).toBe(201)
    expect(res.body.accountId).toBe(sourceRes.body._id)
    expect(res.body.linkedAccountId).toBe(destRes.body._id)
  })

  it('accepts quarterly frequency', async () => {
    const res = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 30000,
      description: 'Insurance',
      category: 'Miscellaneous',
      frequency: 'quarterly',
      dayOfMonth: 15,
    })

    expect(res.status).toBe(201)
    expect(res.body.frequency).toBe('quarterly')
  })

  it('accepts annual frequency', async () => {
    const res = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 120000,
      description: 'Annual subscription',
      category: 'Subscriptions',
      frequency: 'annual',
      dayOfMonth: 1,
    })

    expect(res.status).toBe(201)
    expect(res.body.frequency).toBe('annual')
  })

  it('returns 400 when accountId is missing', async () => {
    const res = await request(app).post('/recurring-transactions').send({
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })

    expect(res.status).toBe(400)
  })

  it('returns 400 when other required fields are missing', async () => {
    const res = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
    })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /recurring-transactions
// ---------------------------------------------------------------------------

describe('GET /recurring-transactions', () => {
  it('returns all recurring transactions including inactive ones', async () => {
    await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })

    const createRes = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 20000,
      description: 'Gym',
      category: 'Subscriptions',
      frequency: 'monthly',
      dayOfMonth: 10,
    })

    // Deactivate the second one
    await request(app)
      .patch(`/recurring-transactions/${createRes.body._id}`)
      .send({ isActive: false })

    const res = await request(app).get('/recurring-transactions')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    const active = res.body.filter((r: { isActive: boolean }) => r.isActive)
    const inactive = res.body.filter((r: { isActive: boolean }) => !r.isActive)
    expect(active).toHaveLength(1)
    expect(inactive).toHaveLength(1)
  })

  it('returns an empty array when no recurring transactions exist', async () => {
    const res = await request(app).get('/recurring-transactions')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// PATCH /recurring-transactions/:id
// ---------------------------------------------------------------------------

describe('PATCH /recurring-transactions/:id', () => {
  it('updates amount, description, and category', async () => {
    const createRes = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })
    const id = createRes.body._id

    const res = await request(app)
      .patch(`/recurring-transactions/${id}`)
      .send({ amount: 98000, description: 'New rent', category: 'Housing' })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(98000)
    expect(res.body.description).toBe('New rent')
  })

  it('deactivates a standing order with isActive: false', async () => {
    const createRes = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })
    const id = createRes.body._id

    const res = await request(app)
      .patch(`/recurring-transactions/${id}`)
      .send({ isActive: false })

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(false)
  })

  it('reactivates a standing order with isActive: true', async () => {
    const createRes = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })
    const id = createRes.body._id

    await request(app)
      .patch(`/recurring-transactions/${id}`)
      .send({ isActive: false })

    const res = await request(app)
      .patch(`/recurring-transactions/${id}`)
      .send({ isActive: true })

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(true)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/recurring-transactions/000000000000000000000000')
      .send({ amount: 10000 })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// DELETE /recurring-transactions/:id
// ---------------------------------------------------------------------------

describe('DELETE /recurring-transactions/:id', () => {
  it('removes the standing order permanently', async () => {
    const createRes = await request(app).post('/recurring-transactions').send({
      accountId: FAKE_ACCOUNT_ID,
      amount: 95000,
      description: 'Rent',
      category: 'Housing',
      frequency: 'monthly',
      dayOfMonth: 1,
    })
    const id = createRes.body._id

    const deleteRes = await request(app).delete(
      `/recurring-transactions/${id}`,
    )
    expect(deleteRes.status).toBe(204)

    const listRes = await request(app).get('/recurring-transactions')
    expect(listRes.body).toHaveLength(0)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete(
      '/recurring-transactions/000000000000000000000000',
    )

    expect(res.status).toBe(404)
  })
})
