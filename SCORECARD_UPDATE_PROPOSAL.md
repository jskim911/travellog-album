# 스코어카드 개선 제안서 (김정수님 확인용)

현재 `c:\Users\PC\Desktop\my app\travellog-album\components\Golf\GolfPage.tsx` 파일에 2가지 기능을 추가/변경하려고 합니다. 코드를 어떻게 수정할지 아래의 비교 내용을 확인해주세요.

## 1. 플레이어 삭제 아이콘 추가
**[기존 코드 - Line 759 주변]**
```tsx
<td className="sticky left-0 z-20 bg-white px-3 py-3 text-xs font-black text-slate-800 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
    <div className="flex flex-col">
        <span className="truncate">{player}</span>
        <span className="text-[9px] text-slate-400 font-bold">P{pIdx + 1}</span>
    </div>
</td>
```

**[수정할 코드]**  `Trash2` 아이콘 버튼을 이름 왼쪽에 배치합니다. (아이콘 클릭 시 해당 플레이어 정보를 삭제하는 함수 `handleRemovePlayer` 실행)
```tsx
<td className="sticky left-0 z-20 bg-white px-3 py-3 text-xs font-black text-slate-800 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
    <div className="flex flex-col">
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleRemovePlayer(pIdx)}
                className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                title="플레이어 삭제"
            >
                <Trash2 size={14} />
            </button>
            <div className="flex flex-col min-w-0">
                <span className="truncate">{player}</span>
                <span className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">P{pIdx + 1}</span>
            </div>
        </div>
    </div>
</td>
```


## 2. 스코어 기록 동그라미/색상 로직 변경
**[기존 코드 - Line 781 주변]** (언더파일 때 빨간색 번호 및 빨간 동그라미가 고정으로 그려집니다.)
```tsx
if (diff === 0) return <span className="text-slate-700">{score}</span>;
if (diff > 0) return <span className="text-blue-500">{score}</span>;

// Under Par Symbols (Red)
return (
    <div className="relative w-full h-full flex items-center justify-center text-red-500">
        <span className="relative z-10">{score}</span>
        {diff === -1 && (
            <div className="absolute inset-0 border-[1.5px] border-red-500 rounded-full scale-110" />
        )}
        {diff === -2 && (
            <div className="absolute inset-0.5 border-[1.5px] border-red-500 rounded-none scale-110" />
        )}
        {diff === -3 && (
            <>
                <div className="absolute inset-0 border-[1.5px] border-red-500 rounded-full scale-110" />
                <div className="absolute inset-0 border-[1.5px] border-red-500 rounded-full scale-125" />
            </>
        )}
    </div>
)
```

**[수정할 코드]** 김정수님이 요청하신대로 버디 1개, 이글 2개의 둥그라미, 알바트로스는 글자만 빨간색 등으로 로직을 변경합니다.
```tsx
// 1. 파(Par) 와 동일할 때 (E)
if (diff === 0) return <span className="text-slate-700 font-black">{score}</span>;

// 2. 오버파 (보기, 더블보기 등 기준타수보다 많을 때): 글자를 파란색으로 표시
if (diff > 0) return <span className="text-blue-500 font-black">{score}</span>;

// 3. 언더파: 기본적으로 빨간색 글자
return (
    <div className="relative w-full h-full flex items-center justify-center text-red-500 font-black">
        <span className="relative z-10">{score}</span>
        
        {/* 기준 타수보다 1개(버디) 적으면: 빨간 둥그라미 1개 */}
        {diff === -1 && (
            <div className="absolute inset-0 border-[2px] border-red-500 rounded-full scale-[1.15]" />
        )}
        
        {/* 기준 타수보다 2개(이글) 적으면: 빨간 둥그라미 2개 */}
        {diff === -2 && (
            <>
              <div className="absolute inset-0 border-[2px] border-red-500 rounded-full scale-[1.10]" />
              <div className="absolute inset-0 border-[2px] border-red-500 rounded-full scale-[1.30]" />
            </>
        )}
        
        {/* 기준 타수보다 3개(알바트로스) 이상 적으면: 추가 원(둥그라미) 없이 글자만 빨간색 */}
        {diff <= -3 && null} 
    </div>
);
```

---
**확인 요청:** 위 코드로 적용했을 때 김정수님이 원하시는 결과 화면과 부합하는지 확인해주시면 즉시 개발 파일 `GolfPage.tsx` 에 적용 완료하겠습니다.
