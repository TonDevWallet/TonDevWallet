/* eslint-disable */
// @ts-nocheck

import { Cell, Slice } from '@ton/core'
import {
  loadAccStatusChange,
  loadAccount,
  loadAccountBlock,
  loadAccountDispatchQueue,
  loadAccountState,
  loadAccountStatus,
  loadAccountStorage,
  loadAnycast,
  loadBinTree,
  loadBinTreeAug,
  loadBlkMasterInfo,
  loadBlkPrevInfo,
  loadBlock,
  loadBlockExtra,
  loadBlockIdExt,
  loadBlockInfo,
  loadBoth,
  loadCoins,
  loadCommonMsgInfo,
  loadCommonMsgInfoRelaxed,
  loadComputeSkipReason,
  loadCurrencyCollection,
  loadDepthBalanceInfo,
  loadDispatchQueue,
  loadEither,
  loadEnqueuedMsg,
  loadExtBlkRef,
  loadExtraCurrencyCollection,
  loadFutureSplitMerge,
  loadHashmap,
  loadHashmapAug,
  loadHashmapAugNode,
  loadHashmapNode,
  loadHmLabel,
  loadHASH_UPDATE,
  loadIhrPendingInfo,
  loadIhrPendingSince,
  loadImportFees,
  loadInMsg,
  loadInMsgDescr,
  loadIntermediateAddress,
  loadLibDescr,
  loadLibRef,
  loadMaybe,
  loadMERKLE_PROOF,
  loadMERKLE_UPDATE,
  loadMessage,
  loadMessageAny,
  loadMessageRelaxed,
  loadMsgEnvelope,
  loadMsgMetadata,
  loadOutAction,
  loadOutList,
  loadOutListNode,
  loadOutMsg,
  loadOutMsgDescr,
  loadOutMsgQueue,
  loadOutMsgQueueExtra,
  loadOutMsgQueueInfo,
  loadPfxHashmap,
  loadPfxHashmapE,
  loadPfxHashmapNode,
  loadProcessedInfo,
  loadProcessedUpto,
  loadShardAccount,
  loadShardAccountBlocks,
  loadShardAccounts,
  loadShardDescr,
  loadShardFeeCreated,
  loadShardHashes,
  loadShardIdent,
  loadShardState,
  loadShardStateUnsplit,
  loadSimpleLib,
  loadSmartContractInfo,
  loadSplitMergeInfo,
  loadStateInit,
  loadStateInitWithLibs,
  loadStorageInfo,
  loadStorageUsed,
  loadStorageUsedShort,
  loadTickTock,
  loadTransaction,
  loadTransactionDescr,
  loadTrActionPhase,
  loadTrBouncePhase,
  loadTrComputePhase,
  loadTrCreditPhase,
  loadTrStoragePhase,
  loadTrue,
  loadUnit,
  loadValueFlow,
  loadVarHashmap,
  loadVarHashmapE,
  loadVarHashmapNode,
} from './block.tlb'

const blockTlbLoaders = [
  loadAccStatusChange,
  loadAccount,
  loadAccountBlock,
  loadAccountDispatchQueue,
  loadAccountState,
  loadAccountStatus,
  loadAccountStorage,
  loadAnycast,
  loadBinTree,
  loadBinTreeAug,
  loadBlkMasterInfo,
  loadBlkPrevInfo,
  loadBlock,
  loadBlockExtra,
  loadBlockIdExt,
  loadBlockInfo,
  loadBoth,
  loadCoins,
  loadCommonMsgInfo,
  loadCommonMsgInfoRelaxed,
  loadComputeSkipReason,
  loadCurrencyCollection,
  loadDepthBalanceInfo,
  loadDispatchQueue,
  loadEither,
  loadEnqueuedMsg,
  loadExtBlkRef,
  loadExtraCurrencyCollection,
  loadFutureSplitMerge,
  loadHashmap,
  loadHashmapAug,
  loadHashmapAugNode,
  loadHashmapNode,
  loadHmLabel,
  loadHASH_UPDATE,
  loadIhrPendingInfo,
  loadIhrPendingSince,
  loadImportFees,
  loadInMsg,
  loadInMsgDescr,
  loadIntermediateAddress,
  loadLibDescr,
  loadLibRef,
  loadMaybe,
  loadMERKLE_PROOF,
  loadMERKLE_UPDATE,
  loadMessage,
  loadMessageAny,
  loadMessageRelaxed,
  loadMsgEnvelope,
  loadMsgMetadata,
  loadOutAction,
  loadOutList,
  loadOutListNode,
  loadOutMsg,
  loadOutMsgDescr,
  loadOutMsgQueue,
  loadOutMsgQueueExtra,
  loadOutMsgQueueInfo,
  loadPfxHashmap,
  loadPfxHashmapE,
  loadPfxHashmapNode,
  loadProcessedInfo,
  loadProcessedUpto,
  loadShardAccount,
  loadShardAccountBlocks,
  loadShardAccounts,
  loadShardDescr,
  loadShardFeeCreated,
  loadShardHashes,
  loadShardIdent,
  loadShardState,
  loadShardStateUnsplit,
  loadSimpleLib,
  loadSmartContractInfo,
  loadSplitMergeInfo,
  loadStateInit,
  loadStateInitWithLibs,
  loadStorageInfo,
  loadStorageUsed,
  loadStorageUsedShort,
  loadTickTock,
  loadTransaction,
  loadTransactionDescr,
  loadTrActionPhase,
  loadTrBouncePhase,
  loadTrComputePhase,
  loadTrCreditPhase,
  loadTrStoragePhase,
  loadTrue,
  loadUnit,
  loadValueFlow,
  loadVarHashmap,
  loadVarHashmapE,
  loadVarHashmapNode,
]

export function parseUsingBlockTypes(cell: Cell) {
  for (const loader of blockTlbLoaders) {
    // Only try to call loaders that accept exactly one argument and it's a Slice
    if (loader.length === 1 && typeof loader === 'function') {
      try {
        const slice = cell.beginParse()
        const parsed = (loader as (slice: Slice) => any)(slice)
        slice.endParse()
        if (parsed) {
          return parsed
        }
      } catch (e) {
        continue
      }
    }
  }
  return null
}
