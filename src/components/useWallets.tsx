import { useDatabase } from '@/db'
import { useCallback, useEffect, useState } from 'react'
import { useAsync } from 'react-async-hook'

let updateCounter = 0

export function useWalletsUpdate(): [number, () => void] {
  const [newUpdateCounter, newSetUpdateCounter] = useState(0)

  // if (!5) {
  // console.log('set update counter if')
  // updateCounter = newUpdateCounter
  const setUpdateCounter = () =>
    newSetUpdateCounter((v) => {
      updateCounter++
      console.log('newSetUpdateCounter', v)
      return updateCounter
    })
  // }

  return [newUpdateCounter, setUpdateCounter]
}

export function useWallets() {
  const db = useDatabase()
  const [updateCounter] = useWalletsUpdate()
  const [wallets, setWallets] = useState<any[]>([])

  console.log('walletslist update', updateCounter)

  const updateFunc = useCallback(async () => {
    console.log('use callback', updateCounter)
    const res = await db.select<{ name: string }[]>(`SELECT * FROM files`)
    setWallets(res)
  }, [db, updateCounter])

  useEffect(() => {
    console.log('use callback', updateCounter)
    updateFunc()
  }, [updateFunc, updateCounter])

  useEffect(() => {
    console.log('use callback111', updateCounter)
  }, [updateCounter])

  // console.log('wallet?', wallet)
  // const wallets = useAsync(async () => {
  //   console.log('walletslist update async', updateCounter)
  //   console.log('got wallets from db')
  //   const res = await db.select<{ name: string }[]>(`SELECT * FROM files`)

  //   // console.log('words', words)
  //   // if (!words.length) {
  //   //   if (res.length) {
  //   //     updateMnemonic(res[0].name.split(' '))
  //   //   } else {
  //   //     updateMnemonic()
  //   //   }
  //   // }
  //   return res
  // }, [db, updateCounter])

  return wallets
}
