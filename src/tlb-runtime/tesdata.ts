import { Cell, beginCell, Address, ExternalAddress, Dictionary } from '@ton/core'

import { ParsedCell } from './TLBRuntime'

// based on https://github.com/ton-community/tlb-test-corpus
export type TLBSchema = string
export type BoCBase64 = string
export type TLBGroupItem = [TLBSchema, [ParsedCell, BoCBase64][]]
export type TLBGroup = string
export type TLBCorpus = { [key: TLBGroup]: TLBGroupItem[] }
export type TLBCase = [TLBSchema, ParsedCell, BoCBase64]
export type TLBGroupFlat = { [key: TLBGroup]: TLBCase[] }
export function makeGroupFlat(corpus: TLBCorpus): TLBGroupFlat {
  const out: TLBGroupFlat = {}
  for (const key of Object.keys(corpus)) {
    if (!out[key]) out[key] = []
    for (const list of corpus[key]) {
      const schema = list[0]
      for (const item of list[1]) {
        out[key].push([schema, item[0], item[1]])
      }
    }
  }
  return out
}
// language=tlb
export const TLBStd = {
  Unit: 'unit$_ = Unit;',
  Bit: 'bit$_ (## 1) = Bit;',
  True: 'true$_ = True;',
  Bool: 'bool_false$0 = Bool; bool_true$1 = Bool;',
  Maybe: 'nothing$0 {X:Type} = Maybe X; just$1 {X:Type} value:X = Maybe X;',
  Either:
    'left$0 {X:Type} {Y:Type} value:X = Either X Y; right$1 {X:Type} {Y:Type} value:Y = Either X Y;',
  VarInteger: 'var_int$_ {n:#} len:(#< n) value:(int (len * 8)) = VarInteger n;',
  VarUInteger: 'var_uint$_ {n:#} len:(#< n) value:(uint (len * 8)) = VarUInteger n;',
  Unary: 'unary_zero$0 = Unary ~0; unary_succ$1 {n:#} x:(Unary ~n) = Unary ~(n + 1);',
}
// language=tlb
export const TLBHmLabel = `${TLBStd.Bit}${TLBStd.Unary}hml_short$0 {m:#} {n:#} len:(Unary ~n) {n <= m} s:(n * Bit) = HmLabel ~n m; hml_long$10 {m:#} n:(#<= m) s:(n * Bit) = HmLabel ~n m; hml_same$11 {m:#} v:Bit n:(#<= m) = HmLabel ~n m;`
// language=tlb
export const TLBLib = {
  Grams: `${TLBStd.VarUInteger}nanograms$_ amount:(VarUInteger 16) = Grams;`,
  HashmapE: `${TLBHmLabel}hm_edge#_ {n:#} {X:Type} {l:#} {m:#} label:(HmLabel ~l n) {n = (~m) + l} node:(HashmapNode m X) = Hashmap n X; hmn_leaf#_ {X:Type} value:X = HashmapNode 0 X; hmn_fork#_ {n:#} {X:Type} left:^(Hashmap n X) right:^(Hashmap n X) = HashmapNode (n + 1) X; hme_empty$0 {n:#} {X:Type} = HashmapE n X; hme_root$1 {n:#} {X:Type} root:^(Hashmap n X) = HashmapE n X;`,
  HashmapAugE: `${TLBHmLabel}ahm_edge#_ {n:#} {X:Type} {Y:Type} {l:#} {m:#} label:(HmLabel ~l n) {n = (~m) + l} node:(HashmapAugNode m X Y) = HashmapAug n X Y; ahmn_leaf#_ {X:Type} {Y:Type} extra:Y value:X = HashmapAugNode 0 X Y; ahmn_fork#_ {n:#} {X:Type} {Y:Type} left:^(HashmapAug n X Y) right:^(HashmapAug n X Y) extra:Y = HashmapAugNode (n + 1) X Y; ahme_empty$0 {n:#} {X:Type} {Y:Type} extra:Y = HashmapAugE n X Y; ahme_root$1 {n:#} {X:Type} {Y:Type} root:^(HashmapAug n X Y) extra:Y = HashmapAugE n X Y;`,
  MsgAddress: `${TLBStd.Maybe}addr_none$00 = MsgAddressExt; addr_extern$01 len:(## 9) external_address:(bits len) = MsgAddressExt; anycast_info$_ depth:(#<= 30) { depth >= 1 } rewrite_pfx:(bits depth) = Anycast; addr_std$10 anycast:(Maybe Anycast) workchain_id:int8 address:bits256  = MsgAddressInt; addr_var$11 anycast:(Maybe Anycast) addr_len:(## 9) workchain_id:int32 address:(bits addr_len) = MsgAddressInt; _ _:MsgAddressInt = MsgAddress; _ _:MsgAddressExt = MsgAddress;`,
}
// language=tlb
export const TLBTVMReflection = `${TLBStd.Maybe}${TLBLib.HashmapE}vm_stk_null#00 = VmStackValue; vm_stk_tinyint#01 value:int64 = VmStackValue; vm_stk_int#0201_ value:int257 = VmStackValue; vm_stk_nan#02ff = VmStackValue; vm_stk_cell#03 cell:^Cell = VmStackValue; _ cell:^Cell st_bits:(## 10) end_bits:(## 10) { st_bits <= end_bits } st_ref:(#<= 4) end_ref:(#<= 4) { st_ref <= end_ref } = VmCellSlice; vm_stk_slice#04 _:VmCellSlice = VmStackValue; vm_stk_builder#05 cell:^Cell = VmStackValue; vm_stk_cont#06 cont:VmCont = VmStackValue; vm_tupref_nil$_ = VmTupleRef 0; vm_tupref_single$_ entry:^VmStackValue = VmTupleRef 1; vm_tupref_any$_ {n:#} ref:^(VmTuple (n + 2)) = VmTupleRef (n + 2); vm_tuple_nil$_ = VmTuple 0; vm_tuple_tcons$_ {n:#} head:(VmTupleRef n) tail:^VmStackValue = VmTuple (n + 1); vm_stk_tuple#07 len:(## 16) data:(VmTuple len) = VmStackValue; vm_stack#_ depth:(## 24) stack:(VmStackList depth) = VmStack; vm_stk_cons#_ {n:#} rest:^(VmStackList n) tos:VmStackValue = VmStackList (n + 1); vm_stk_nil#_ = VmStackList 0; _ cregs:(HashmapE 4 VmStackValue) = VmSaveList; gas_limits#_ remaining:int64 _:^[ max_limit:int64 cur_limit:int64 credit:int64 ] = VmGasLimits; _ libraries:(HashmapE 256 ^Cell) = VmLibraries; vm_ctl_data$_ nargs:(Maybe uint13) stack:(Maybe VmStack) save:VmSaveList cp:(Maybe int16) = VmControlData; vmc_std$00 cdata:VmControlData code:VmCellSlice = VmCont; vmc_envelope$01 cdata:VmControlData next:^VmCont = VmCont; vmc_quit$1000 exit_code:int32 = VmCont; vmc_quit_exc$1001 = VmCont; vmc_repeat$10100 count:uint63 body:^VmCont after:^VmCont = VmCont; vmc_until$110000 body:^VmCont after:^VmCont = VmCont; vmc_again$110001 body:^VmCont = VmCont; vmc_while_cond$110010 cond:^VmCont body:^VmCont after:^VmCont = VmCont; vmc_while_body$110011 cond:^VmCont body:^VmCont after:^VmCont = VmCont; vmc_pushint$1111 value:int32 next:^VmCont = VmCont;`

export const groupCorpus: TLBCorpus = {
  'Built-in types': [
    [
      '_ x:# = OneNatParam;',
      [[{ kind: 'OneNatParam', x: 42 }, 'b5ee9c724101010100060000080000002a05a6f044']],
    ],
    [
      '_ x:# y:# = TowNatParam;',
      [
        [
          {
            kind: 'TowNatParam',
            x: 827,
            y: 387,
          },
          'b5ee9c7241010101000a0000100000033b00000183b67dff10',
        ],
      ],
    ],
    [
      '_ x:^Cell = ParamCell; _ x:^ParamCell = UseParamCell;',
      [
        [
          {
            kind: 'ParamCell',
            x: Cell.fromHex('b5ee9c724101010100020000004cacb9cd'),
          },
          'b5ee9c724101020100050001000100006e1c5c44',
        ],
        [
          {
            kind: 'UseParamCell',
            x: {
              kind: 'ParamCell',
              x: Cell.fromHex('b5ee9c724101010100020000004cacb9cd'),
            },
          },
          'b5ee9c724101030100080001000101000200002fb6d5b6',
        ],
      ],
    ],
    [
      'a$0 x:# y:# = MultiConstructor; b$1 x:# = MultiConstructor;',
      [
        [
          {
            kind: 'MultiConstructor_a',
            x: 1,
            y: 2,
          },
          'b5ee9c7241010101000b0000110000000080000001406a6a04c2',
        ],
        [
          {
            kind: 'MultiConstructor_b',
            x: 3,
          },
          'b5ee9c7241010101000700000980000001c001719107',
        ],
      ],
    ],
    [
      '_ x:(## 5) = LimitNat; _ x:LimitNat y:# = UseLimitNat;',
      [
        [
          {
            kind: 'LimitNat',
            x: 10,
          },
          'b5ee9c7241010101000300000154868284e3',
        ],
        [
          {
            kind: 'UseLimitNat',
            x: {
              kind: 'LimitNat',
              x: 10,
            },
            y: 5,
          },
          'b5ee9c72410101010007000009500000002c9d50916c',
        ],
      ],
    ],
    [
      '_ {n:#} x:(## n) = ParamType n; _#de x:(ParamType 4) = UseParamType;',
      [
        [
          {
            kind: 'ParamType',
            n: 4,
            x: 10,
          },
          'b5ee9c72410101010003000001a82322a95d',
        ],
        [
          {
            kind: 'UseParamType',
            x: {
              kind: 'ParamType',
              n: 4,
              x: 10,
            },
          },
          'b5ee9c72410101010004000003dea82541ef56',
        ],
      ],
    ],
    [
      '_ {n:#} x:(## n) = ExprType (2 + n); _ x:(ExprType 6) = UseExprType; _#de x:^UseExprType = CellUseExprType;',
      [
        [
          {
            kind: 'UseExprType',
            x: {
              kind: 'ExprType',
              n: 4,
              x: 10n,
            },
          },
          'b5ee9c72410101010003000001a82322a95d',
        ],
        [
          {
            kind: 'CellUseExprType',
            x: {
              kind: 'UseExprType',
              x: {
                kind: 'ExprType',
                n: 4,
                x: 10n,
              },
            },
          },
          'b5ee9c72410102010007000102de010001a84df293b3',
        ],
      ],
    ],
    [
      '_ x:(#< 4) y:(#<= 4) = LessThan;',
      [
        [
          {
            kind: 'LessThan',
            x: 3,
            y: 7,
          },
          'b5ee9c72410101010003000001fcef6f16cb',
        ],
      ],
    ],
    [
      'a$0 {n:#} = ParamConstructor n; b$1 {n:#} = Constructor (n + 1);',
      [
        [
          {
            kind: 'ParamConstructor_a',
            n: 3,
          },
          'b5ee9c7241010101000300000140f6d24034',
        ],
        [
          {
            kind: 'ParamConstructor_b',
            n: 3,
          },
          'b5ee9c7241010101000300000140f6d24034',
        ],
      ],
    ],
    [
      '_ (## 1) = AnonymousData;',
      [
        [
          {
            kind: 'AnonymousData',
            anon0: 1,
          },
          'b5ee9c72410101010003000001c08ee9b6b6',
        ],
      ],
    ],
    [
      'a#a value:int257 = IntType; b#b value:uint256 = UintType;',
      [
        [
          {
            kind: 'IntType',
            value: -115792089237316195423570985008687907853269984665640564039457584007913129639935n,
          },
          'b5ee9c72410101010023000041a8000000000000000000000000000000000000000000000000000000000000000c832f60b1',
        ],
        [
          {
            kind: 'UintType',
            value: 115792089237316195423570985008687907853269984665640564039457584007913129639935n,
          },
          'b5ee9c72410101010023000041bffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8a8a15cf2',
        ],
      ],
    ],
    [
      '_ const:# = CheckKeyword;',
      [
        [
          {
            kind: 'CheckKeyword',
            const0: 3,
          },
          'b5ee9c724101010100060000080000000317f3ff1c',
        ],
      ],
    ],
  ],
  'Based on block.tlb': [
    [
      TLBStd.Unit,
      [
        [
          {
            kind: 'Unit',
          },
          'b5ee9c724101010100020000004cacb9cd',
        ],
      ],
    ],
    [
      `${TLBStd.Bool} _ x:Bool = BoolUser;`,
      [
        [{ kind: 'BoolUser', x: true }, 'b5ee9c72410101010003000001c08ee9b6b6'],
        [{ kind: 'BoolUser', x: false }, 'b5ee9c7241010101000300000140f6d24034'],
      ],
    ],
    [
      TLBStd.Unary,
      [
        [{ kind: 'Unary_unary_zero' }, 'b5ee9c7241010101000300000140f6d24034'],
        [
          { kind: 'Unary_unary_succ', x: { kind: 'Unary_unary_zero' }, n: 0 },
          'b5ee9c72410101010003000001a0ec7a70d7',
        ],
        [
          {
            kind: 'Unary_unary_succ',
            x: { kind: 'Unary_unary_succ', x: { kind: 'Unary_unary_zero' }, n: 0 },
            n: 1,
          },
          'b5ee9c72410101010003000001d0e12ee8a6',
        ],
        [
          {
            kind: 'Unary_unary_succ',
            x: {
              kind: 'Unary_unary_succ',
              x: { kind: 'Unary_unary_succ', x: { kind: 'Unary_unary_zero' }, n: 0 },
              n: 1,
            },
            n: 2,
          },
          'b5ee9c72410101010003000001e89f3fd21c',
        ],
      ],
    ],
    [
      `${TLBStd.Maybe} _ x:Nat2 y:# = A; _ x:(## 2) = Nat2; _ x:(Maybe A) = OptionType;`,
      [
        [
          {
            kind: 'OptionType',
            x: {
              kind: 'Maybe_just',
              value: {
                kind: 'A',
                x: {
                  kind: 'Nat2',
                  x: 3,
                },
                y: 4,
              },
            },
          },
          'b5ee9c72410101010007000009e0000000905cecef69',
        ],
        [
          {
            kind: 'OptionType',
            x: {
              kind: 'Maybe_nothing',
            },
          },
          'b5ee9c7241010101000300000140f6d24034',
        ],
      ],
    ],
    [
      `${TLBStd.Maybe} ${TLBLib.HashmapE} _ x:(## 2) = Nat2; _ x:(Maybe Nat2) = OptionType; _ x:(HashmapE 100 ^OptionType) = HashmapOptionType;`,
      [
        [
          {
            kind: 'HashmapOptionType',
            x: Dictionary.empty(Dictionary.Keys.BigUint(100))
              .set(3n, {
                kind: 'OptionType',
                x: {
                  kind: 'Maybe_just',
                  value: {
                    kind: 'Nat2',
                    x: 3,
                  },
                },
              })
              .set(5n, {
                kind: 'OptionType',
                x: {
                  kind: 'Maybe_just',
                  value: {
                    kind: 'Nat2',
                    x: 1,
                  },
                },
              }),
          },
          'b5ee9c72410106010018000101c0010203d86002040101f4030001f0010166050001b085af7d0c',
        ],
      ],
    ],
    [
      `${TLBLib.HashmapE} a$_ {n:#} x:(HashmapE n uint5) = HashmapVarKey n; a$_ x:(HashmapVarKey 5) = HashmapVarKeyUser;`,
      [
        [
          {
            kind: 'HashmapVarKeyUser',
            x: {
              kind: 'HashmapVarKey',
              n: 5,
              x: Dictionary.empty(Dictionary.Keys.BigUint(7)).set(3n, 6).set(7n, 9),
            },
          },
          'b5ee9c72410104010011000101c00102016202030003f1a00003f2602ada1261',
        ],
      ],
    ],
    [
      `${TLBLib.HashmapE} a$_ {n:#} x:(HashmapE (n+2) uint5) = HashmapExprKey n; a$_ x:(HashmapExprKey 5) = HashmapExprKeyUser;`,
      [
        [
          {
            kind: 'HashmapExprKeyUser',
            x: {
              kind: 'HashmapExprKey',
              n: 5,
              x: Dictionary.empty(Dictionary.Keys.BigUint(7)).set(3n, 6).set(7n, 9),
            },
          },
          'b5ee9c72410104010011000101c0010201d202030003f1a00003f2603b1bfe60',
        ],
      ],
    ],
    [
      `${TLBLib.HashmapE} a$_ {A:Type} t:# x:A = OneComb A; a$_ {A: Type} x:(HashmapE 200 (OneComb A)) = HashmapOneComb A; a$_ x:(HashmapOneComb uint5) = HashmapOneCombUser;`,
      [
        [
          {
            kind: 'HashmapOneCombUser',
            x: {
              kind: 'HashmapOneComb',
              x: Dictionary.empty(Dictionary.Keys.BigUint(200))
                .set(1n, { kind: 'OneComb', t: 3, x: 6 })
                .set(19n, { kind: 'OneComb', t: 5, x: 4 }),
            },
          },
          'b5ee9c7241010401001a000101c0010203d8700203000ba0800000019a000ba180000002920ec1bd9e',
        ],
      ],
    ],
    [
      `${TLBLib.Grams} ${TLBLib.HashmapAugE} fip$_ y:(## 5) = FixedIntParam; _$_ x:(HashmapAugE 16 Grams FixedIntParam) = HashmapAugEUser;`,
      [
        [
          {
            kind: 'HashmapAugEUser',
            x: Dictionary.empty(Dictionary.Keys.Uint(16))
              .set(5, { extra: { kind: 'FixedIntParam', y: 11 }, value: 8n })
              .set(6, { extra: { kind: 'FixedIntParam', y: 9 }, value: 3n }),
          },
          'b5ee9c72410104010015000101c00102059c000c02030005558844000544881cb03ae0fb',
        ],
      ],
    ],
    [
      `${TLBLib.MsgAddress} _ x:MsgAddress = AnyAddressUser;`,
      [
        [
          {
            kind: 'AnyAddressUser',
            x: Address.parse('EQBmzW4wYlFW0tiBgj5sP1CgSlLdYs-VpjPWM7oPYPYWQEdT'),
          },
          'b5ee9c72410101010024000043800cd9adc60c4a2ada5b103047cd87ea14094a5bac59f2b4c67ac67741ec1ec2c8101a51407b',
        ],
        [
          {
            kind: 'AnyAddressUser',
            x: new ExternalAddress(5623048054n, 48),
          },
          'b5ee9c7241010101000a00000f46000029e51ceed0cc1604f8',
        ],
        [
          {
            kind: 'AnyAddressUser',
            x: null,
          },
          'b5ee9c724101010100030000012094418655',
        ],
      ],
    ],
    [
      `${TLBStd.Bit} a#a x:Bit = BitUser;`,
      [
        [
          {
            kind: 'BitUser',
            x: false,
          },
          'b5ee9c72410101010003000001a4f3edea10',
        ],
        [
          {
            kind: 'BitUser',
            x: true,
          },
          'b5ee9c72410101010003000001ac3cb5339a',
        ],
      ],
    ],
    [
      `${TLBLib.Grams} _ x: Grams = GramsUser;`,
      [
        [
          {
            kind: 'GramsUser',
            x: 100000n,
          },
          'b5ee9c7241010101000600000730186a08506d18a4',
        ],
      ],
    ],
    [
      `${TLBLib.MsgAddress} _ x: MsgAddressExt = ExtAddressUser;`,
      [
        [
          {
            kind: 'ExtAddressUser',
            x: new ExternalAddress(5623048054n, 48),
          },
          'b5ee9c7241010101000a00000f46000029e51ceed0cc1604f8',
        ],
      ],
    ],
    [
      `${TLBLib.MsgAddress} _ x: MsgAddressExt = ExtAddressUser;`,
      [
        [
          {
            kind: 'ExtAddressUser',
            x: null,
          },
          'b5ee9c724101010100030000012094418655',
        ],
      ],
    ],
    [
      `${TLBStd.VarInteger} ${TLBStd.VarUInteger} _ v:(VarUInteger 5) = VarUIntegerUser; _ v:(VarInteger 5) = VarIntegerUser;`,
      [
        [
          {
            kind: 'VarUIntegerUser',
            v: 5n,
          },
          'b5ee9c7241010101000400000320b07162297c',
        ],
        [
          {
            kind: 'VarIntegerUser',
            v: -6n,
          },
          'b5ee9c724101010100040000030fd4f38f8742',
        ],
      ],
    ],
    [
      `${TLBLib.HashmapE} _ x:(HashmapE 8 uint16) = HashmapEUser;`,
      [
        [
          {
            kind: 'HashmapEUser',
            x: Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Uint(16)),
          },
          'b5ee9c7241010101000300000140f6d24034',
        ],
        [
          {
            kind: 'HashmapEUser',
            x: Dictionary.empty(Dictionary.Keys.Uint(8), Dictionary.Values.Uint(16))
              .set(0, 5)
              .set(1, 6)
              .set(2, 7),
          },
          'b5ee9c7241010601001d000101c0010201cd02050201200304000500016000050001a00005400078f2192257',
        ],
      ],
    ],
    [
      `${TLBLib.HashmapE} ${TLBStd.VarUInteger} _ v:(VarUInteger 5) = VarUIntegerUser; _ x:(HashmapE 100 VarUIntegerUser) = HashmapVUIUser;`,
      [
        [
          {
            kind: 'HashmapVUIUser',
            x: Dictionary.empty(Dictionary.Keys.BigUint(100))
              .set(6n, { kind: 'VarUIntegerUser', v: 5n })
              .set(7n, { kind: 'VarUIntegerUser', v: 3n }),
          },
          'b5ee9c7241010401001e000101c001021bb18000000000000000000000003802030003082c0003081cf1308855',
        ],
      ],
    ],
    [
      `${TLBTVMReflection} _ t:VmStack = VMStackUser;`,
      [
        [
          {
            kind: 'VMStackUser',
            t: [
              {
                type: 'int',
                value: '1',
              },
              {
                type: 'int',
                value: '2',
              },
              {
                type: 'int',
                value: '3',
              },
            ],
          },
          'b5ee9c72410104010029000118000003010000000000000003010112010000000000000002020112010000000000000001030000ffe142a1',
        ],
      ],
    ],
  ],
  'Combinator types': [
    [
      '_ {A:Type} t:# x:A = OneComb A; _ y:(OneComb(OneComb(OneComb int3))) = ManyComb;',
      [
        [
          {
            kind: 'ManyComb',
            y: {
              kind: 'OneComb',
              t: 5,
              x: { kind: 'OneComb', t: 6, x: { kind: 'OneComb', t: 7, x: 3 } },
            },
          },
          'b5ee9c7241010101000f00001900000005000000060000000770fb20c765',
        ],
      ],
    ],
    [
      `${TLBStd.Maybe} ${TLBStd.Either} a$_ {A:Type} t:# x:A = OneComb A;a$_ {X:Type} info:int32 init:(Maybe (Either X ^int22)) other:(Either X ^(OneComb X)) body:(Either X ^X) = CombArgCellRef X; a$_ x:(CombArgCellRef int12) = CombArgCellRefUser;`,
      [
        [
          {
            kind: 'CombArgCellRefUser',
            x: {
              kind: 'CombArgCellRef',
              body: { kind: 'Either_right', value: 3 },
              info: 4,
              other: { kind: 'Either_right', value: { kind: 'OneComb', t: 5, x: 5 } },
              init: { kind: 'Maybe_just', value: { kind: 'Either_right', value: 4 } },
            },
          },
          'b5ee9c7241010401001b00030900000004f80102030005000012000b00000005005800030038e8db0d65',
        ],
      ],
    ],
    [
      '_ {x:#} value:(## x) = BitLenArg x; _ {n:#} ref:^(BitLenArg (n + 2)) = MathExprAsCombArg (n + 2);',
      [
        [
          {
            kind: 'MathExprAsCombArg',
            n: 8,
            ref: { kind: 'BitLenArg', x: 10, value: 1000n },
          },
          'b5ee9c72410102010007000100010003fa2059c5f201',
        ],
      ],
    ],
    [
      `${TLBStd.Maybe} a$_ msg:^(Maybe Any) = RefCombinatorAny;`,
      [
        [
          {
            kind: 'RefCombinatorAny',
            msg: { kind: 'Maybe_just', value: beginCell().storeUint(676, 10).endCell() },
          },
          'b5ee9c72410102010007000100010003d49018c6b738',
        ],
      ],
    ],
    [
      `${TLBStd.Maybe} a$_ {X:Type} t:# y:(Maybe ^X) = RefCombinatorInRefHelper X;a$_ msg:^(RefCombinatorInRefHelper Any) = RefCombinatorInRef;`,
      [
        [
          {
            kind: 'RefCombinatorInRef',
            msg: {
              kind: 'RefCombinatorInRefHelper',
              t: 3,
              y: { kind: 'Maybe_just', value: beginCell().storeUint(3, 32).endCell() },
            },
          },
          'b5ee9c7241010301001100010001010900000003c0020008000000034d5c97fe',
        ],
      ],
    ],
  ],
  'Naming tag': [
    [
      '_ x:(## 3) = EmptyConstructor 0; _ x:(## 16) = EmptyConstructor 1; _ x:# = EmptyConstructor 2; _ a:(EmptyConstructor 0) b:(EmptyConstructor 1) c:(EmptyConstructor 2) = UseEmptyConstructor;',
      [
        [
          {
            kind: 'UseEmptyConstructor',
            a: { kind: 'EmptyConstructor__', x: 7 },
            b: { kind: 'EmptyConstructor__1', x: 65535 },
            c: { kind: 'EmptyConstructor__2', x: 4294967295 },
          },
          'b5ee9c7241010101000900000dfffffffffffff014d52370',
        ],
        [
          {
            kind: 'UseEmptyConstructor',
            a: { kind: 'EmptyConstructor__', x: 1 },
            b: { kind: 'EmptyConstructor__1', x: 1 },
            c: { kind: 'EmptyConstructor__2', x: 1 },
          },
          'b5ee9c7241010101000900000d20002000000030835f7ae3',
        ],
      ],
    ],
  ],
  'Complex Expressions': [
    [
      'message#_ len:(## 7) { len <= 127 } text:(bits (len * 8)) = Message;',
      [
        [
          {
            kind: 'Message',
            len: 127,
            text: 'TON data are DAG-cell bags: <= 1023 bits + 4 refs, then TL-B serialized & SHA-256 hashed with transparent/representation hashes',
          },
          'b5ee9c724101010100820000fffea89e9c40c8c2e8c240c2e4ca4088828e5ac6cad8d840c4c2cee67440787a406260646640c4d2e8e64056406840e4cacce65840e8d0cadc40a8985a8440e6cae4d2c2d8d2f4cac8404c40a690825a646a6c40d0c2e6d0cac840eed2e8d040e8e4c2dce6e0c2e4cadce85ee4cae0e4cae6cadce8c2e8d2dedc40d0c2e6d0cae7ca5409e0',
        ],
      ],
    ],
    [
      '_ a:(3 * uint4) b:(3 * int4) = TupleCheck;',
      [
        [
          { kind: 'TupleCheck', a: [1, 2, 3], b: [-1, -2, -3] },
          'b5ee9c72410101010005000006123fede0dabd81',
        ],
        [
          { kind: 'TupleCheck', a: [1, 8, 15], b: [-1, 5, -5] },
          'b5ee9c7241010101000500000618ff5bf41fe366',
        ],
      ],
    ],
    [
      '_ a:(## 1) b:a?(## 32) = ConditionalField;',
      [
        [{ kind: 'ConditionalField', a: 1, b: 5 }, 'b5ee9c7241010101000700000980000002c098d97633'],
        [{ kind: 'ConditionalField', a: 0 }, 'b5ee9c7241010101000300000140f6d24034'],
      ],
    ],
    [
      '_ a:(## 6) b:(a . 2)?(## 32) = BitSelection;',
      [
        [{ kind: 'BitSelection', a: 5, b: 5 }, 'b5ee9c7241010101000700000914000000160ae584e0'],
        [{ kind: 'BitSelection', a: 8 }, 'b5ee9c7241010101000700000920000000163e8f4b94'],
      ],
    ],
    [
      '_ a:# b:# = Simple; _ x:(## 1) y:x?^Simple = ConditionalRef;',
      [
        [
          { kind: 'ConditionalRef', x: 1, y: { kind: 'Simple', a: 3, b: 4 } },
          'b5ee9c7241010201000e000101c0010010000000030000000434fa1906',
        ],
        [{ kind: 'ConditionalRef', x: 0 }, 'b5ee9c7241010101000300000140f6d24034'],
      ],
    ],
    [
      '_ n:# { 5 + n = 7 } = EqualityExpression;',
      [
        [
          {
            kind: 'EqualityExpression',
            n: 2,
          },
          'b5ee9c7241010101000600000800000002147094ee',
        ],
      ],
    ],
    [
      '_ flags:(## 10) { flags <= 100 } = ImplicitCondition;',
      [
        [
          {
            kind: 'ImplicitCondition',
            flags: 100,
          },
          'b5ee9c7241010101000400000319202ad77920',
        ],
      ],
    ],
    [
      's$_ a:# b:# = Simple; _$_ x:(## 1) y:x?^Simple = ConditionalRef;',
      [
        [
          {
            kind: 'ConditionalRef',
            x: 1,
            y: {
              kind: 'Simple',
              a: 3,
              b: 4,
            },
          },
          'b5ee9c7241010201000e000101c0010010000000030000000434fa1906',
        ],
      ],
    ],
  ],
  'Constructor Tags': [
    [
      '_ y:(## 5) = FixedIntParam;tmpd#_ y:FixedIntParam c:# = SharpConstructor;',
      [
        [
          { kind: 'SharpConstructor', c: 5, y: { kind: 'FixedIntParam', y: 6 } },
          'b5ee9c72410101010007000009300000002c648f6840',
        ],
      ],
    ],
    [
      '_ a:# = EmptyTag;',
      [[{ kind: 'EmptyTag', a: 3 }, 'b5ee9c724101010100060000080000000317f3ff1c']],
    ],
    [
      'a#f4 x:# = SharpTag;',
      [[{ kind: 'SharpTag', x: 3 }, 'b5ee9c7241010101000700000af40000000306f7ccb3']],
    ],
    [
      'a$1011 x:# = DollarTag;',
      [[{ kind: 'DollarTag', x: 3 }, 'b5ee9c72410101010007000009b000000038480a0ef9']],
    ],
    [
      '_ a:# b:# = Simple; b$1 Simple = ConstructorOrder; a$0 a:Simple = ConstructorOrder;',
      [
        [
          { kind: 'ConstructorOrder_a', a: { kind: 'Simple', a: 2, b: 3 } },
          'b5ee9c7241010101000b0000110000000100000001c057ef60c1',
        ],
      ],
    ],
    [
      'a a:#  = CheckCrc32;b b:# c:# = CheckCrc32;',
      [
        [{ kind: 'CheckCrc32_a', a: 3 }, 'b5ee9c7241010101000a00001009d97e7a00000003dcb97fc6'],
        [
          { kind: 'CheckCrc32_b', b: 4, c: 5 },
          'b5ee9c7241010101000e000018a842b3f00000000400000005d97dda4d',
        ],
      ],
    ],
  ],
  'Advanced types': [
    [
      'a$_ n:# = ParamConst 1 1; b$01 m:# k:# = ParamConst 2 1; c$01 n:# m:# k:# = ParamConst 3 3; d$_ n:# m:# k:# l:# = ParamConst 4 2;',
      [
        [
          { kind: 'ParamConst_d', n: 1, k: 2, l: 3, m: 4 },
          'b5ee9c7241010101001200002000000001000000040000000200000003a4703bc2',
        ],
        [
          { kind: 'ParamConst_b', k: 2, m: 4 },
          'b5ee9c7241010101000b0000114000000100000000a0cfddc662',
        ],
        [
          { kind: 'ParamConst_c', k: 2, m: 4, n: 3 },
          'b5ee9c7241010101000f00001940000000c000000100000000a0f0b3fdd9',
        ],
      ],
    ],
    [
      'a$0 = ParamDifNames 2 ~1; b$1 = ParamDifNames 3 ~1; c$1 {n:#} x:(ParamDifNames 2 ~n) = ParamDifNames 2 ~(n + 1); d$0 {m:#} x:(ParamDifNames 3 ~m) = ParamDifNames 3 ~(m * 2);',
      [
        [
          {
            kind: 'ParamDifNames_c',
            n: 3,
            x: {
              kind: 'ParamDifNames_c',
              n: 2,
              x: { kind: 'ParamDifNames_c', n: 1, x: { kind: 'ParamDifNames_a' } },
            },
          },
          'b5ee9c72410101010003000001e89f3fd21c',
        ],
        [
          {
            kind: 'ParamDifNames_d',
            m: 4,
            x: {
              kind: 'ParamDifNames_d',
              m: 2,
              x: { kind: 'ParamDifNames_d', m: 1, x: { kind: 'ParamDifNames_b' } },
            },
          },
          'b5ee9c7241010101000300000118ea50bcef',
        ],
      ],
    ],
    [
      'a$0 = ParamDifNames 2 ~1; b$1 = ParamDifNames 3 ~1; c$1 {n:#} x:(ParamDifNames 2 ~n) = ParamDifNames 2 ~(n + 1); d$0 {m:#} x:(ParamDifNames 3 ~m) = ParamDifNames 3 ~(m * 2); e$0 {k:#} x:(ParamDifNames 2 ~k) = ParamDifNamesUser;',
      [
        [
          {
            kind: 'ParamDifNamesUser',
            k: 4,
            x: {
              kind: 'ParamDifNames_c',
              n: 3,
              x: {
                kind: 'ParamDifNames_c',
                n: 2,
                x: { kind: 'ParamDifNames_c', n: 1, x: { kind: 'ParamDifNames_a' } },
              },
            },
          },
          'b5ee9c7241010101000300000174580c39c3',
        ],
        [
          {
            kind: 'ParamDifNamesUser',
            k: 5,
            x: {
              kind: 'ParamDifNames_c',
              n: 3,
              x: {
                kind: 'ParamDifNames_c',
                n: 2,
                x: { kind: 'ParamDifNames_c', n: 1, x: { kind: 'ParamDifNames_a' } },
              },
            },
          },
          'b5ee9c7241010101000300000174580c39c3',
        ],
      ],
    ],
    [
      'b$1 {y:#} t:# z:# { t = (~y) * 2} = NegationFromImplicit ~(y + 1);',
      [
        [
          { kind: 'NegationFromImplicit', t: 4, y: 2, z: 7 },
          'b5ee9c7241010101000b0000118000000200000003c08811f174',
        ],
      ],
    ],
    [
      `${TLBStd.Unary} hm_edge#_ {l:#} {m:#} label:(Unary ~l) {7 = (~m) + l} = UnaryUserCheckOrder;`,
      [
        [
          {
            kind: 'UnaryUserCheckOrder',
            l: 2,
            m: 5,
            label: {
              kind: 'Unary_unary_succ',
              n: 1,
              x: { kind: 'Unary_unary_succ', n: 0, x: { kind: 'Unary_unary_zero' } },
            },
          },
          'b5ee9c72410101010003000001d0e12ee8a6',
        ],
      ],
    ],
    [
      'block_info#9bc7a987 seq_no:# { prev_seq_no:# } { ~prev_seq_no + 1 = seq_no } = LoadFromNegationOutsideExpr;',
      [
        [
          {
            kind: 'LoadFromNegationOutsideExpr',
            prev_seq_no: 3,
            seq_no: 4,
          },
          'b5ee9c7241010101000a0000109bc7a9870000000448b22913',
        ],
      ],
    ],
  ],
  'Slice types': [
    [
      'a$_ {e:#} h:(int (e * 8)) f:(uint (7 * e)) i:(bits (5 + e)) j:(int 5) k:(uint e) tc:Cell = IntBitsParametrized e; a$_ {x:#} a:(IntBitsParametrized x) = IntBitsParametrizedInside x; a$_ x:(IntBitsParametrizedInside 5) = IntBitsParametrizedOutside;',
      [
        [
          {
            kind: 'IntBitsParametrizedOutside',
            x: {
              kind: 'IntBitsParametrizedInside',
              a: {
                kind: 'IntBitsParametrized',
                e: 6,
                f: 3n,
                h: 7n,
                j: 9,
                k: 10n,
                i: beginCell().storeUint(676, 10).endCell().beginParse().loadBits(10),
                tc: beginCell().storeUint(76, 10).endCell(),
              },
              x: 5,
            },
          },
          'b5ee9c7241010101001200001f0000000000070000000000ea44942640e5e8bbef',
        ],
        [
          {
            kind: 'IntBitsParametrizedOutside',
            x: {
              kind: 'IntBitsParametrizedInside',
              a: {
                kind: 'IntBitsParametrized',
                e: 5,
                f: 3n,
                h: 7n,
                j: 9,
                k: 10n,
                i: beginCell().storeUint(676, 10).endCell().beginParse().loadBits(10),
                tc: beginCell().storeUint(76, 10).endCell(),
              },
              x: 5,
            },
          },
          'b5ee9c7241010101001000001b0000000007000000007522542640ec5f943f',
        ],
      ],
    ],
    [
      'a$_ t:# ^[ q:# ] ^[ a:(## 32) ^[ e:# ] ^[ b:(## 32) d:# ^[ c:(## 32) ] ] ] = CellsSimple;',
      [
        [
          { kind: 'CellsSimple', a: 5, b: 3, c: 4, d: 100, e: 4, q: 1, t: 3 },
          'b5ee9c724101050100270002080000000301020008000000010208000000050403011000000003000000640400080000000412faecae',
        ],
      ],
    ],
    [
      'b$_ d:int11 g:bits2 {Arg:Type} arg:Arg x:Any = IntBits Arg; a$_ {x:#} a:(IntBits (int (1 + x))) = IntBitsInside (x * 2); a$_ x:(IntBitsInside 6) = IntBitsOutside;',
      [
        [
          {
            kind: 'IntBitsOutside',
            x: {
              kind: 'IntBitsInside',
              a: {
                kind: 'IntBits',
                arg: 3n,
                d: 5,
                g: beginCell().storeUint(3, 2).endCell().beginParse().loadBits(2),
                x: beginCell().storeUint(76, 10).endCell(),
              },
              x: 3,
            },
          },
          'b5ee9c7241010101000600000700b989907105b202',
        ],
      ],
    ],
  ],
  'Correct tag calculation': [
    [
      '_#0201_ = LeastSignificantBitRemoved;',
      [[{ kind: 'LeastSignificantBitRemoved' }, 'b5ee9c72410101010004000003020157409964']],
    ],
    [
      'a a:#  = CheckCrc32;b b:# c:# = CheckCrc32;',
      [
        [{ kind: 'CheckCrc32_a', a: 42 }, 'b5ee9c7241010101000a00001009d97e7a0000002aceec709e'],
        [
          { kind: 'CheckCrc32_b', b: 123, c: 456 },
          'b5ee9c7241010101000e000018a842b3f00000007b000001c8463417ec',
        ],
      ],
    ],
    [
      'tag seq_no:# seq_no_2:# { prev_seq_no:# } { 2 + ~prev_seq_no + 1 = 2 + seq_no + 2 } { prev_seq_no_2:# } { ~prev_seq_no_2 = 100 + seq_no_2 * 8 * 7 } = ComplexCrc32;',
      [
        [
          // TODO it data actual only deserialize, in some cases serialization and deserialization data may differ, this must be taken into account in the test set
          {
            kind: 'ComplexCrc32',
            seq_no: 1999,
            seq_no_2: 2000,
          },
          'b5ee9c7241010101000e0000180c478dae000007cf000007d0380fee36',
        ],
      ],
    ],
  ],
}
export const groupCorpusFlat = makeGroupFlat(groupCorpus)
