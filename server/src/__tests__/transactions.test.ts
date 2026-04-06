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
  const { connection } = await import('mongoose')
  const collections = await connection.db?.collections()
  if (collections) {
    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createAccount(overrides = {}) {
  const res = await request(app)
    .post('/accounts')
    .send({
      kind: 'Girokonto',
      name: 'Main',
      openingBalance: 100000,
      openingDate: '2026-01-01',
      ...overrides,
    })
  return res.body as { _id: string; balance: number }
}

// ---------------------------------------------------------------------------
// POST /accounts/:id/transactions
// ---------------------------------------------------------------------------

describe('POST /accounts/:id/transactions', () => {
  it('creates a transaction and returns it', async () => {
    const account = await createAccount()

    const res = await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({
        date: '2026-03-15',
        amount: -8500,
        description: 'Supermarket',
        category: 'Food',
      })

    expect(res.status).toBe(201)
    expect(res.body.accountId).toBe(account._id)
    expect(res.body.amount).toBe(-8500)
    expect(res.body.description).toBe('Supermarket')
    expect(res.body.category).toBe('Food')
    expect(res.body.date).toBeDefined()
    expect(res.body._id).toBeDefined()
  })

  it('returns 404 for an unknown account id', async () => {
    const res = await request(app)
      .post('/accounts/000000000000000000000000/transactions')
      .send({
        date: '2026-03-15',
        amount: -8500,
        description: 'Ghost',
        category: 'Food',
      })

    expect(res.status).toBe(404)
  })

  it('returns 400 when required fields are missing', async () => {
    const account = await createAccount()

    const res = await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ description: 'Missing fields' })

    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /accounts/:id/transactions
// ---------------------------------------------------------------------------

describe('GET /accounts/:id/transactions', () => {
  it('returns all transactions for an account sorted by date descending', async () => {
    const account = await createAccount()

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-01', amount: -5000, description: 'First', category: 'Food' })

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-20', amount: -3000, description: 'Third', category: 'Food' })

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-10', amount: -2000, description: 'Second', category: 'Food' })

    const res = await request(app).get(`/accounts/${account._id}/transactions`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body[0].description).toBe('Third')
    expect(res.body[1].description).toBe('Second')
    expect(res.body[2].description).toBe('First')
  })

  it('returns empty array when account has no transactions', async () => {
    const account = await createAccount()

    const res = await request(app).get(`/accounts/${account._id}/transactions`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// PATCH /transactions/:id
// ---------------------------------------------------------------------------

describe('PATCH /transactions/:id', () => {
  it('updates amount, description, and category', async () => {
    const account = await createAccount()

    const created = await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-15', amount: -8500, description: 'Old', category: 'Food' })

    const res = await request(app)
      .patch(`/transactions/${created.body._id}`)
      .send({ amount: -9000, description: 'Updated', category: 'Entertainment' })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(-9000)
    expect(res.body.description).toBe('Updated')
    expect(res.body.category).toBe('Entertainment')
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/transactions/000000000000000000000000')
      .send({ description: 'Ghost' })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// DELETE /transactions/:id
// ---------------------------------------------------------------------------

describe('DELETE /transactions/:id', () => {
  it('removes the transaction', async () => {
    const account = await createAccount()

    const created = await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-15', amount: -8500, description: 'To delete', category: 'Food' })

    const res = await request(app).delete(`/transactions/${created.body._id}`)

    expect(res.status).toBe(204)

    const list = await request(app).get(`/accounts/${account._id}/transactions`)
    expect(list.body).toHaveLength(0)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/transactions/000000000000000000000000')

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Balance derivation
// ---------------------------------------------------------------------------

describe('account balance derivation', () => {
  it('equals openingBalance + sum of transaction amounts', async () => {
    const account = await createAccount({ openingBalance: 100000 })

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-01', amount: 323643, description: 'Salary', category: 'Income' })

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-02', amount: -95442, description: 'Darlehen', category: 'Housing' })

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-03', amount: -70000, description: 'Tagesgeld', category: 'Transfer' })

    const res = await request(app).get(`/accounts/${account._id}`)

    expect(res.body.balance).toBe(100000 + 323643 - 95442 - 70000)
  })

  it('updates correctly after a transaction is deleted', async () => {
    const account = await createAccount({ openingBalance: 100000 })

    const tx = await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-01', amount: -50000, description: 'Rent', category: 'Housing' })

    await request(app).delete(`/transactions/${tx.body._id}`)

    const res = await request(app).get(`/accounts/${account._id}`)

    expect(res.body.balance).toBe(100000)
  })
})

// ---------------------------------------------------------------------------
// DELETE /accounts/:id guard
// ---------------------------------------------------------------------------

describe('DELETE /accounts/:id with transactions', () => {
  it('is blocked when the account has at least one transaction', async () => {
    const account = await createAccount()

    await request(app)
      .post(`/accounts/${account._id}/transactions`)
      .send({ date: '2026-03-01', amount: -5000, description: 'Coffee', category: 'Food' })

    const res = await request(app).delete(`/accounts/${account._id}`)

    expect(res.status).toBe(409)
  })
})
