> UFCS 和 deducing this 有什么关系

**UFCS**（Uniform Function Call Syntax，統一函式呼叫語法）和 **deducing this**（C++23 的 P0847 特性）雖然看起來都是為了讓「成員函式」和「自由函式」更容易互換使用，但它們的定位、解決的問題和最終結局其實差很大。

簡單講它們的關係：

| 項目               | UFCS                                      | Deducing this (explicit object parameter)          |
|--------------------|-------------------------------------------|----------------------------------------------------|
| 主要目標           | 讓 `x.f()` 和 `f(x)` 兩種寫法都能找到同一個函式（成員或非成員） | 讓成員函式可以把隱式的 `this` 參數寫成**顯式第一參數**，並能完美推導型別與 value category |
| 呼叫語法           | 改變呼叫語法（支援兩種寫法）               | 呼叫語法完全不變，仍然只能用 `obj.method()`       |
| 寫法改變           | 主要改呼叫端                              | 主要改**函式宣告**端                               |
| 是否進入 overload set | 試圖把 member function 和 free function 放進同一個 overload set | 不改變 name lookup 和 overload resolution 規則     |
| 最終命運           | 多個提案（P0121, P0251, P0355 等）都被拒絕或撤回 | **已經在 C++23 正式納入**（非常成功）              |
| 為什麼被接受/拒絕  | 會大幅改變現有 overload resolution，破壞太多既有程式碼，API 穩定性問題嚴重 | 幾乎不破壞任何既有程式碼，解決的痛點明確且強大     |

### 兩者最直接的關係在早期提案階段

在 2017–2019 年左右，**deducing this** 的最初提案（P0847 早期版本）其實是跟 UFCS 綁在一起討論的：

- 當時有人想用「把 this 當第一參數」的方式來**部分實現 UFCS 的效果**（因為成員函式可以寫成 free function 風格）
- 但提案作者後來明確把方向轉向「只解決成員函式內部的問題」，**把 UFCS 相關的部分完全切掉**
- 結果就是：**deducing this 活下來了，而且活得很好**；UFCS 則幾乎全軍覆沒（到 2025 年還在零星討論 opt-in 版本，但進度非常緩慢）

### 實際程式碼對比

**傳統寫法（要四個 overload）**

```cpp
struct String {
    String substr(size_t pos, size_t len) &;
    String substr(size_t pos, size_t len) &&;
    String substr(size_t pos, size_t len) const&;
    String substr(size_t pos, size_t len) const&&;
};
```

**C++23 deducing this 寫法（只要一個）**

```cpp
struct String {
    template <class Self>
    Self substr(this Self&& self, size_t pos, size_t len) {
        // self 可以是 String&, String&&, const String&, const String&&
        // 完美轉發，完美推導 cv + value category
        ...
    }
};
```

而 UFCS 如果成功，則會長這樣（但目前沒成功）：

```cpp
// 假設 UFCS 通過
String substr(String const& s, size_t pos, size_t len);  // 自由函式

s.substr(3, 5);   // 也能找到上面的自由函式（理想狀態）
```

### 總結一句話

**deducing this 可以看作是「UFCS 夢想中最安全、最不具爭議、也最實用的一部分」**，它放棄了改變呼叫語法和 name lookup 的野心，只專注在「讓成員函式自己能更強大、更可重用」，因此成功進入 C++23。

而完整的 UFCS 因為破壞性太大，到現在（2026 年）仍然還在社群裡吵，沒有共識。

希望這個解釋清楚回答了你的問題～

---

> 为什么 UFCS 破壞性太大

UFCS（Unified / Uniform Function Call Syntax）被認為破壞性太大，主要集中在幾個核心問題上，這些問題讓多數 WG21（C++ 標準委員會）成員覺得「不能接受」，即使它看起來「語法上向後相容」。

核心原因是：**它表面上不讓既有程式碼從編譯通過變成編譯失敗，但實際上會嚴重破壞既有程式碼的「語義穩定性」與「可預測性」**，這在大型專案、長期維護的程式庫中是致命的。

### 為什麼說它破壞性「最糟糕的那一種」？

1. **打破成員函式呼叫的隔離保證（最重要的點）**  
   C++ 從一開始就有一個非常強的設計原則：  
   `obj.method(args)` 這種寫法，**絕對只會呼叫到 class / struct / union 裡面宣告的成員函式**（或從基類繼承來的），**永遠不會受到 ADL（Argument-Dependent Lookup）影響，也不會被遠方 namespace 裡突然出現的 free function 搶走**。

   UFCS 把 `obj.method(args)` 也放進 overload set，讓 ADL 能找到的 free function 也可能被選中。

   結果：  
   - 你原本確定只呼叫成員的程式碼，未來可能突然呼叫到別人寫的 free function（即使你沒 include 那個 header）。  
   - 只要有人在 ADL 能找到的 namespace 裡加一個同名 free function（即使是 template），你的 `obj.method()` 語義就可能變掉。  
   - 這叫「spooky action at a distance」——遠方某個 library 更新，就默默改了你的行為。

   Ville Voutilainen 在 P3027R0 裡直接說：  
   「這不是 bug-free 的向後相容，這是個超級大 bug，因為它故意打破了一個重大且極其重要的設計保證。」

2. **介面穩定性被徹底摧毀（API / ABI 長期穩定性）**  
   現在很多程式庫作者會刻意把某些操作做成**成員函式**，就是為了防止使用者意外呼叫到 ADL 找到的東西（例如防止意外呼叫到 `std::begin`、`std::swap` 等）。

   一旦 UFCS 通過：  
   - 作者無法再保證 `x.f()` 一定呼叫到自己的成員 `f`。  
   - 使用者也無法保證自己寫的 `x.f()` 不會被遠方新加的 free function 蓋掉。  
   → 大型專案（尤其是金融、遊戲引擎、嵌入式、長期維護的系統程式庫）最怕這種「今天 compile 通過，明天升級 library 就改行為」的狀況。

3. **overload resolution 變得更複雜、更難 debug**  
   原本 `x.f()` 的 lookup 很簡單，只有成員。  
   UFCS 後變成：成員 + ADL free functions 一起比。  
   → 歧義（ambiguity）案例暴增，特別是當有 template free function 時。  
   → 即使沒歧義，也更容易選到「意外的」那一個，debug 成本大幅上升。

4. **沒有好的「優先順序」方案能讓大家滿意**  
   歷年提案試過各種方式處理「成員 vs free function 誰優先」：

   | 方案類型          | 描述                                      | 為什麼被拒絕的主要原因                          |
   |-------------------|-------------------------------------------|-------------------------------------------------|
   | 單一輪 overload resolution | 全部一起比（成員 + free）                 | 破壞既有保證，容易選錯                          |
   | 兩輪（member first, fallback to free） | 先找成員，找不到再找 free                 | 還是會有「突然多個 free 讓行為變」的風險        |
   | 兩輪（free first） | 先找 free，再 fallback 到 member          | 更糟，會大量打破既有成員呼叫                    |
   | 只在 `f(x)` 語法下啟用 UFCS | `x.f()` 仍只找 member                     | 很多人覺得這不是真正的 UFCS，解決力不夠         |

   委員會多次 poll 都沒共識（例如 Barry Revzin 2019 文章裡提到的投票結果，經常是 N / A 最多）。

### 總結：為什麼 deducing this 活下來，UFCS 死得很慘？

- deducing this 只改**函式寫法**（把 this 顯式化），不碰 name lookup、不碰 ADL、不碰呼叫語法 → 零破壞既有程式碼行為。  
- UFCS 直接動到**最核心的 name lookup 與 overload resolution 隔離牆**，這牆是 C++ 能活 40 年、能讓大型專案長期維護的關鍵防線之一。

所以很多人說：  
「UFCS 想要解決的痛點（成員 vs free 語法不統一）是真痛，但它開的藥方比病還毒。」

目前（2026 年）看來，UFCS 要進標準的機會已經非常渺茫，除非改成完全 opt-in（例如 `using class X;` 或新運算子 `x..f()`），否則幾乎不可能被接受。

有沒有哪部分還想再深入？例如看具體的歧義例子、或 opt-in 版本的最新提案？
