import { useEffect, useState } from 'react'
import { compileFunc } from '@ton-community/func-js'
import { stdlib } from './stdlib'
import { Blockchain, SmartContract } from '@ton/sandbox'
import { Address, Cell, beginCell } from '@ton/core'

export function EditorPage() {
  const [funcCode, setFuncCode] = useState('')
  const [fiftCode, setFiftCode] = useState('')

  useEffect(() => {
    ;(async () => {
      const funcTemplate = `
        #include "stdlib.fc";

        () recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
         return ();
        }

        (cell) get_call() method_id {
          ${funcCode}
        }
      `

      console.log('compiling', funcTemplate)
      const result = await compileFunc({
        // Targets of your project
        targets: ['main.fc'],
        // Sources
        sources: {
          'stdlib.fc': stdlib,
          'main.fc': funcTemplate,
          // The rest of the files which are included in main.fc if any
        },
      })

      if (result.status !== 'ok') {
        throw new Error('!ok')
      }

      setFiftCode(result.fiftCode)

      const blockchain = await Blockchain.create()
      // const ctr = blockchain.openContract({
      //   address: new Address(
      //     0,
      //     Buffer.from([
      //       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      //       0, 0, 0,
      //     ])
      //   ),
      //   init: {
      //     code: Cell.fromBase64(result.codeBoc),
      //     data: beginCell().endCell(),
      //   },
      // })
      console.log('war', result)
      const smc = SmartContract.create(blockchain, {
        address: new Address(
          0,
          Buffer.from([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0,
          ])
        ),
        balance: 1000000000n,
        code: Cell.fromBase64(result.codeBoc),
        data: beginCell().endCell(),
      })
      const res = smc.get('get_call')
      // await blockchain.setShardAccount(new Address(0, Buffer.from([0])), {
      //   lastTransactionHash: 0n,
      //   lastTransactionLt: 0n,
      //   account: {
      //     addr: new Address(0, Buffer.from([0])),
      //     storage: {
      //       balance: {
      //         coins: 10000000000n,
      //       },
      //       lastTransLt: 0n,
      //       state: {
      //         state: {
      //           code: Cell.fromBase64(result.codeBoc),
      //           data: beginCell().endCell(),
      //         },
      //         // stateHash: 0n,
      //         type: 'active',
      //       },
      //     },
      //     storageStats: {
      //       lastPaid: 0,
      //       used: {
      //         bits: 0n,
      //         cells: 0n,
      //         publicCells: 0n,
      //       },
      //     },
      //   },
      // })

      // const res = await blockchain.runGetMethod(new Address(0, Buffer.from([0])), 'get_call', [])
      // blockchain.openContract(SmartContract.create())
      // const contract = new SmartContract()
      console.log('result', result, res)
    })()
  }, [funcCode])
  return (
    <div className="flex flex-col">
      Editor
      <textarea
        name="func-code"
        id="func-code"
        value={funcCode}
        onChange={(e) => setFuncCode(e.target.value)}
        rows={10}
      ></textarea>
      <div id="fift-code">
        <code>
          <pre>{fiftCode}</pre>
        </code>
      </div>
    </div>
  )
}
