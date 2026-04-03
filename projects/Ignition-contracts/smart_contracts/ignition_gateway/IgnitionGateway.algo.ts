import {
  Account,
  assert,
  Contract,
  GlobalState,
  gtxn,
  log,
  Txn,
  Uint64,
  uint64,
} from '@algorandfoundation/algorand-typescript'

export class IgnitionGateway extends Contract {
  treasuryAddress = GlobalState<Account>({ key: 'treasury_address' })
  baseModelPrice = GlobalState<uint64>({ key: 'base_model_price' })

  public createApplication(): void {
    this.treasuryAddress.value = Txn.sender
    this.baseModelPrice.value = Uint64(100_000)
  }

  public payForAi(payTxn: gtxn.PaymentTxn): void {
    assert(payTxn.receiver === this.treasuryAddress.value, 'Invalid treasury receiver')
    assert(payTxn.amount >= this.baseModelPrice.value, 'Insufficient payment amount')

    log('PAID_BASE_MODEL')
  }
}
