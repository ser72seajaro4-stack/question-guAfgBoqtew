// ===================== 設定 =====================
// 回答の送信先。FormSubmit の有効化後は、届いたメールに書かれている
// ランダムな文字列に置き換えると、ページのソースにメールアドレスが載らなくなる（README参照）。
const FORM_TO = "ser72seajaro4@gmail.com";
// 送信に失敗したときに画面に出す、手動送信用のアドレス
const MAIL_TO = "ser72seajaro4@gmail.com";
// ================================================

const ENDPOINT = "https://formsubmit.co/ajax/" + FORM_TO;
const DRAFT_KEY = "front-survey-draft-v2";

// ---------- 選択肢の部品 ----------
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => String(a + i));
const ROOMS = {
  "本店":   {"2F": range(201, 205), "3F": range(306, 314), "4F": range(415, 423)},
  "駅前店": {"1F": range(101, 112), "2F": range(213, 225)},
};
const DAYS  = ["月","火","水","木","金","土","日","祝日"];
const BANDS = ["9〜12時","12〜15時","15〜18時","18〜21時","21〜24時","24〜5時"];
const SCALE = ["いつも","ときどき","あまり","知らなかった"];
// 全角数字を半角にし、数字以外を取り除く
const toHalf = s => String(s).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, "");
function fmtMin(m){
  m = +m;
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h}時間${r ? r + "分" : ""}` : `${r}分`;
}

// ---------- 質問 ----------
// parts が2つ以上ある質問は、回答の枠を分けて表示する。
// type: radio / check / rooms / stepper / duration(時間) / select / text / area / repeat
const SECTIONS = [
  {no:"Q0", title:"回答者について", note:"以降の質問は、主に入る店舗について答えてください。", qs:[
    {no:"0-1", t:"主に入る店舗", req:true, parts:[{id:"q0_1", type:"radio", opts:["本店","駅前店","両方"]}]},
    {no:"0-2", t:"勤務歴", parts:[{id:"q0_2", type:"radio", opts:["半年未満","半年〜1年","1〜3年","3年以上"]}]},
    {no:"0-3", t:"よく入る時間帯", multi:true, parts:[{id:"q0_3", type:"check", opts:["午前（9〜12時）","昼（12〜17時）","夕方〜夜（17〜22時）","深夜（22〜5時）"]}]},
    {no:"0-4", t:"フロントに入る頻度", parts:[{id:"q0_4", type:"radio", opts:["ほぼ毎回","ときどき","たまに"]}]},
    {no:"0-5", t:"お名前", opt:true, parts:[{id:"q0_5", type:"text", placeholder:"空欄でも送信できます"}]},
  ]},

  {no:"Q1", title:"部屋の割り当て", note:"部屋番号はタップで選べます。0-1で選んだ店舗の部屋だけが表示されます。", qs:[
    {no:"1-1", t:"大人数用に取っておくことが多い部屋はどこですか。", multi:true,
      parts:[{id:"q1_1", type:"rooms", none:"特に決めていない"}]},
    {no:"1-2", t:"混雑時に、大部屋を計いくつ取っておきますか。",
      parts:[{id:"q1_2", type:"stepper", min:0, max:10, unit:"室"}]},
    {no:"1-3", t:"午前中以外で、少人数を大部屋に入れてもよいと判断するのはどんなときですか。", multi:true,
      parts:[{id:"q1_3", type:"check", other:true, opts:[
        "空室が多いとき","予約が少ないとき","小部屋が満室のとき","平日","昼〜夕方",
        "深夜","部屋移動の了承をもらえたとき","午前中以外は入れない","その他"]}]},
    {no:"1-4", t:"当日入店の方に、機種・モニターの希望を聞いていますか。",
      parts:[
        {id:"q1_4", label:"聞いているか", type:"radio", other:true, opts:["いつも聞く","空室が多いときだけ聞く","聞かない（言われたら対応）","その他"]},
        {id:"q1_4b", label:"「空室が多い」の目安（全部屋に対する空室の割合）", type:"stepper", min:5, max:100, step:5, unit:"%以上", showIf:{id:"q1_4", eq:"空室が多いときだけ聞く"}},
      ]},
    {no:"1-5", t:"「短時間はキッチンの近く、長時間は遠く」のルールをどれくらい意識していますか。",
      parts:[{id:"q1_5", type:"radio", opts:SCALE}]},
    {no:"1-6", t:"「夜フリータイムは遠くに入れない（本店：4階、駅前：2階）」のルールをどれくらい意識していますか。",
      parts:[{id:"q1_6", type:"radio", opts:SCALE}]},
    {no:"1-7", t:"「飲み放題はキッチンの近く」のルールをどれくらい意識していますか。",
      parts:[{id:"q1_7", type:"radio", opts:SCALE}]},
    {no:"1-8", t:"客から指名されやすい・人気がある部屋はどこですか。",
      parts:[
        {id:"q1_8", label:"部屋", type:"rooms", none:"特にない"},
        {id:"q1_8b", label:"人気の理由", type:"check", other:true, opts:[
          "機種が新しい","プロジェクター・デュアル","広い","音響が良い","場所が便利","雰囲気が良い","その他"]},
      ]},
    {no:"1-9", t:"テレワークでよく案内する部屋はどこですか。", multi:true,
      parts:[{id:"q1_tw", type:"rooms", none:"特に決めていない"}]},
    {no:"1-10", t:"客層によって、できれば案内を避けている部屋はありますか。", hint:"客層ごとに部屋が違う場合は「パターンを追加」で分けてください。",
      parts:[{id:"q1_9", type:"repeat", max:3, fields:[
        {key:"crowd",  label:"客層", type:"check", other:true, opts:[
          "学生グループ","子ども連れ","大人数","酔っている客","カップル","1人客","高齢の方","その他"]},
        {key:"rooms",  label:"避けている部屋", type:"rooms"},
        {key:"reason", label:"理由", type:"check", other:true, opts:[
          "騒音が周りに響く","目が届きにくい","フロント・キッチンから遠い","設備・音響の不調","喫煙ルームの近く","その他"]},
      ]}],
      none:{id:"q1_9_none", label:"特にない"}},
    {no:"1-11", t:"部屋を決めるとき、マニュアル以外に自分なりに気をつけていることはありますか。", opt:true,
      parts:[{id:"q1_10", type:"area", placeholder:"一言でも大丈夫です"}]},
  ]},

  {no:"Q2", title:"混雑と利用時間・人数の制限", qs:[
    {no:"2-1", t:"混むことが多い曜日", multi:true, parts:[{id:"q2_1", type:"check", opts:DAYS}]},
    {no:"2-2", t:"特に混む時間帯", multi:true,
      parts:[
        {id:"q2_2a", label:"平日", type:"check", opts:BANDS},
        {id:"q2_2b", label:"土日・祝日", type:"check", opts:BANDS},
      ]},
    {no:"2-3", t:"1年の中で混む時期", multi:true,
      parts:[{id:"q2_3", type:"check", other:true, opts:[
        "年末年始","春休み","GW","夏休み","冬休み","テスト明け","歓送迎会シーズン",
        "ハロウィン","クリスマス","給料日後","その他"]}]},
    {no:"2-4", t:"利用時間に上限をかけることが多いのはいつですか。", hint:"パターンが複数ある場合は「パターンを追加」で分けてください。",
      parts:[{id:"q2_4", type:"repeat", max:3, fields:[
        {key:"days",  label:"曜日",   type:"check", opts:DAYS},
        {key:"band",  label:"時間帯", type:"check", opts:BANDS},
        {key:"limit", label:"上限",   type:"duration", min:30, max:300, step:30, start:120, suffix:"まで"},
      ]}],
      none:{id:"q2_4_none", label:"上限はかけていない"}},
    {no:"2-5", t:"利用人数に下限をかけることが多いのはいつですか。", hint:"パターンが複数ある場合は「パターンを追加」で分けてください。",
      parts:[{id:"q2_ppl", type:"repeat", max:3, fields:[
        {key:"days",  label:"曜日",   type:"check", opts:DAYS},
        {key:"band",  label:"時間帯", type:"check", opts:BANDS},
        {key:"limit", label:"下限人数", type:"stepper", min:2, max:20, unit:"名以上"},
      ]}],
      none:{id:"q2_ppl_none", label:"下限はかけていない"}},
    {no:"2-6", t:"利用人数に下限をかけたとき、どのような文言でお断りしていますか。",
      parts:[
        {id:"q2_ng", label:"伝えている内容", type:"check", other:true, opts:[
          "混雑していること","人数の下限があること","待ち時間の目安","長めの待ち時間を伝える","もう一方の店舗の案内",
          "人数を分けての利用の提案","別の時間帯・予約のおすすめ","その他"]},
        {id:"q2_ngb", label:"実際の言い方（任意）", type:"area", placeholder:"例：「ただいま混み合っておりまして、○名様以上でのご案内とさせていただいております」"},
      ]},
    {no:"2-7", t:"「混雑時なので延長不可」と判断する目安は何ですか。",
      parts:[
        {id:"q2_5a", label:"待っている組数", type:"stepper", min:1, max:10, unit:"組以上"},
        {id:"q2_5b", label:"空室の数（全部屋に対する空室の割合）", type:"stepper", min:0, max:100, step:5, unit:"%以下"},
        {id:"q2_5c", label:"ほかの判断材料", type:"check", other:true, opts:[
          "予約が詰まっている","人手が足りない","清掃が追いついていない","その他"]},
      ]},
    {no:"2-8", t:"待ち時間を伝えるとき、見込みより何分くらい多めに伝えていますか。",
      parts:[{id:"q2_7", type:"duration", min:0, max:60, step:1, start:10, suffix:"多め", zero:"見込みどおり伝える"}]},
  ]},

  {no:"Q3", title:"送客", note:"もう一方の店舗へお客様を紹介するときについて答えてください。", qs:[
    {no:"3-1", t:"もう一方の店舗を紹介するのはどんなときですか。",
      parts:[
        {id:"q2_6a", label:"待ち時間の目安", type:"duration", min:1, max:90, step:1, start:30, suffix:"以上待つとき"},
        {id:"q2_6b", label:"ほかの理由", type:"check", other:true, opts:[
          "空く見込みがない","希望の部屋がない（喫煙ルームなど）","大人数で入れる部屋がない","その他"]},
      ]},
    {no:"3-2", t:"送客される側のとき、お客様が持ってくる送客紙には最低限何が書かれていてほしいですか。", multi:true,
      parts:[{id:"q3s_2", type:"check", other:true, opts:[
        "人数","代表者の名前","希望の利用時間","ドリンクプラン","会員証の有無・種類","未成年の有無・最年少の年齢",
        "学生かどうか","喫煙ルームの希望","機種・モニターの希望","クーポンの有無","送客元の店舗名","送客した時刻",
        "送客元の担当者名","その他"]}]},
    {no:"3-3", t:"送客紙を渡すとき、お客様に伝えていることは何ですか。",
      parts:[
        {id:"q3s_3", label:"伝えている内容", type:"check", other:true, opts:[
          "もう一方の店舗の場所・行き方","先方に連絡済みであること","送客紙をフロントに渡してほしいこと",
          "向こうでの待ち時間の見込み","料金は同じであること","会員証が使えるかどうか",
          "クーポンが使えるかどうか","戻ってきた場合の扱い","その他"]},
        {id:"q3s_3b", label:"実際の言い方（任意）", type:"area", placeholder:"例：「この紙を向こうの受付でお渡しください」"},
      ]},
  ]},

  {no:"Q4", title:"退室コールと時間超過", qs:[
    {no:"4-1", t:"早めに退室コールをかけるとき、終了の何分前にかけることが多いですか。",
      parts:[{id:"q3_1", type:"duration", min:10, max:20, step:1, start:12, suffix:"前"}]},
    {no:"4-2", t:"ピンク（10分前）より早めにかけるのは、どんなときが多いですか。", multi:true,
      parts:[{id:"q3_2", type:"check", other:true, opts:[
        "待っている客がいる","フロントを離れる","混雑している","清掃が詰まっている","年齢の時間制限がある部屋","その他"]}]},
    {no:"4-3", t:"時間超過の部屋への再コールは、超過してからどれくらい待ってからしますか。",
      parts:[{id:"q3_3", type:"duration", min:0, max:20, step:1, start:5, suffix:"待つ", zero:"すぐにかける"}]},
    {no:"4-4", t:"再コールの後、どれくらい待ってから部屋に行きますか。",
      parts:[{id:"q3_4", type:"duration", min:0, max:20, step:1, start:5, suffix:"待つ", zero:"すぐに行く"}]},
    {no:"4-5", t:"30分利用・テレワーク利用の客に、退室コールが「不要」か聞いていますか。",
      parts:[{id:"q3_5", type:"radio", opts:["いつも聞く","ときどき聞く","聞いていない"]}]},
    {no:"4-6", t:"30分利用・テレワーク利用の客は、退室コールを「不要」と答えることが多いですか。",
      parts:[{id:"q3_6", type:"radio", opts:["多い","半々","少ない"]}]},
  ]},

  {no:"Q5", title:"清掃", note:"1部屋を片付け・消毒して「空室」に戻せるまでの時間で答えてください。", qs:[
    {no:"5-1", t:"スタンバイ（通常の清掃）で、1部屋の清掃にかかる実際の時間",
      parts:[{id:"q4c_1", type:"duration", min:1, max:30, step:1, start:10, suffix:"くらい"}]},
    {no:"5-2", t:"ウェイティング（客が待っているときの清掃）で、1部屋の清掃にかかる実際の時間",
      parts:[{id:"q4c_2", type:"duration", min:1, max:30, step:1, start:5, suffix:"くらい"}]},
  ]},

  {no:"Q6", title:"受付・年齢確認", qs:[
    {no:"6-1", t:"身分証の提示をお願いするのは、どんなときですか。", multi:true,
      parts:[{id:"q4_1", type:"check", other:true, opts:[
        "見た目が若い","申告と見た目が合わない","学生証を持っていない","夜遅い時間の来店",
        "飲み放題（A放）の注文時","喫煙ルームの希望時","基本はお願いしない","その他"]}]},
    {no:"6-2", t:"学生ではない未成年の客の年齢は、どうやって確認していますか。", multi:true,
      parts:[{id:"q4_2", type:"check", other:true, opts:[
        "①の生年月日を見る","口頭で聞く","身分証を見せてもらう","保護者に確認する","特に確認していない","その他"]}]},
    {no:"6-3", t:"A放（アルコール飲み放題）の客に「本日お車でお越しですか」と毎回聞いていますか。",
      parts:[{id:"q4_3", type:"radio", opts:["毎回","ときどき","ほとんど聞かない"]}]},
    {no:"6-4", t:"1d（単品ドリンク）の注文をフロントで聞いていますか。",
      parts:[{id:"q4_4", type:"radio", other:true, opts:["いつも聞く","混んでいなければ聞く","ほとんど部屋のQRコードで案内する","その他"]}]},
  ]},

  {no:"Q7", title:"ミス・つまずきやすい点", qs:[
    {no:"7-1", t:"自分や周りでよく起きるミス", multi:true,
      parts:[{id:"q5_1", type:"check", other:true, opts:[
        "ハンディー入力忘れ","飲み放題登録忘れ","ピン（磁石）のつけ忘れ","無線連絡忘れ","空室への戻し忘れ",
        "会員証・クーポンの入力漏れ","年齢制限の見落とし","退室コール忘れ","その他"]}]},
    {no:"7-2", t:"新人がつまずきやすいと思う業務", multi:true,
      parts:[{id:"q5_2", type:"check", other:true, opts:[
        "部屋決め","POS入力","年齢確認","ドリンクプランの説明","飲み放題登録","会員証・クーポン",
        "退室コール","無線での清掃指示","満室時の待ち案内","会計","その他"]}]},
    {no:"7-3", t:"ミスを防ぐために自分でしている工夫", opt:true,
      parts:[{id:"q5_3", type:"area", placeholder:"一言でも大丈夫です"}]},
    {no:"7-4", t:"マニュアルに入れてほしいこと・あいまいだと感じるルール", opt:true,
      parts:[{id:"q5_4", type:"area", placeholder:"一言でも大丈夫です"}]},
    {no:"7-5", t:"フロントをしている人へのお願い", opt:true,
      parts:[{id:"q5_5", type:"area", placeholder:"一言でも大丈夫です"}]},
    {no:"7-6", t:"そのほか、フロント業務について自由にお書きください", opt:true,
      parts:[{id:"q5_6", type:"area", placeholder:"アンケートへの感想などでも大丈夫です"}]},
  ]},
];

const ALL_QS = SECTIONS.flatMap(s => s.qs);
const form = document.getElementById("survey");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- 部品の描画 ----------
function chips(id, kind, opts, cls = "choice"){
  return `<div class="choices">` + opts.map((o, i) =>
    `<label class="${cls}"><input type="${kind}" id="${id}_${i}" name="${id}" value="${esc(o)}"><span>${esc(o)}</span></label>`
  ).join("") + `</div>`;
}
function otherBox(id){
  return `<input type="text" class="other" id="${id}_other" data-other-for="${id}" placeholder="「その他」の内容（任意）" aria-label="その他の内容" hidden>`;
}

function renderField(p, id){
  switch (p.type){
    case "radio":
    case "check":
      return chips(id, p.type === "radio" ? "radio" : "checkbox", p.opts) + (p.other ? otherBox(id) : "");
    case "rooms": {
      let h = `<div class="rooms">`;
      for (const [store, floors] of Object.entries(ROOMS)){
        h += `<div class="store" data-store="${store}"><div class="store-name">${store}</div>`;
        for (const [floor, list] of Object.entries(floors)){
          h += `<div class="floor"><span class="floor-no">${floor}</span><div class="room-grid">` +
            list.map(r => `<label class="room"><input type="checkbox" id="${id}_${store}_${r}" name="${id}" value="${store} ${r}" data-store="${store}"><span>${r}</span></label>`).join("") +
            `</div></div>`;
        }
        h += `</div>`;
      }
      if (p.none) h += `<div class="choices"><label class="choice"><input type="checkbox" id="${id}_none" name="${id}" value="${esc(p.none)}" data-none><span>${esc(p.none)}</span></label></div>`;
      return h + `</div>`;
    }
    case "stepper":
      return `<div class="stepper" data-min="${p.min}" data-max="${p.max}" data-stepsize="${p.step || 1}">
        <button type="button" class="step" data-step="-1" data-for="${id}" aria-label="減らす">−</button>
        <input type="text" id="${id}" class="num-input" inputmode="numeric" autocomplete="off" placeholder="—" aria-label="${esc(p.label || "数")}（数字で入力もできます）">
        <button type="button" class="step" data-step="1" data-for="${id}" aria-label="増やす">＋</button>
        <span class="unit">${esc(p.unit)}</span>
        <button type="button" class="clear" data-clear="${id}">クリア</button>
      </div>`;
    case "duration":
      return `<div class="duration" data-dur="${id}" data-zero="${esc(p.zero || "")}" data-suffix="${esc(p.suffix || "")}">
        <div class="dur-head">
          <input type="text" id="${id}_num" class="num-input dur-num" inputmode="numeric" autocomplete="off" placeholder="—" aria-label="${esc(p.label || "時間")}（分を数字で入力もできます）">
          <span class="unit">分</span>
          <output class="dur-out" id="${id}_out">未選択</output>
        </div>
        <div class="dur-row">
          <button type="button" class="step" data-dstep="-1" data-for="${id}" aria-label="短くする">−</button>
          <input type="range" id="${id}_range" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.start ?? p.min}" aria-label="${esc(p.label || "時間")}">
          <button type="button" class="step" data-dstep="1" data-for="${id}" aria-label="長くする">＋</button>
        </div>
        <div class="dur-scale"><span>${fmtMin(p.min)}</span><span>${fmtMin(p.max)}</span></div>
        <input type="hidden" id="${id}" value="">
        <button type="button" class="clear" data-dclear="${id}">選択を取り消す</button>
      </div>`;
    case "select":
      return `<select id="${id}"><option value="">選んでください</option>${p.opts.map(o => `<option>${esc(o)}</option>`).join("")}</select>`;
    case "text":
      return `<input type="text" id="${id}" placeholder="${esc(p.placeholder || "")}">`;
    case "area":
      return `<textarea id="${id}" placeholder="${esc(p.placeholder || "")}"></textarea>`;
  }
  return "";
}

function renderPart(p, framed){
  if (p.type === "repeat"){
    return `<div class="repeat" data-repeat="${p.id}">
      <div class="repeat-rows"></div>
      <button type="button" class="add-row" data-add="${p.id}">＋ パターンを追加</button>
    </div>`;
  }
  const show = p.showIf ? ` data-show-id="${p.showIf.id}" data-show-eq="${esc(p.showIf.eq)}" hidden` : "";
  const field = renderField(p, p.id);
  if (!framed && !p.label) return `<div class="solo"${show}>${field}</div>`;
  return `<div class="part"${show}><div class="part-label">${esc(p.label || "")}</div>${field}</div>`;
}

function repeatRow(p, n){
  const rowId = `${p.id}_r${n}`;
  return `<div class="part repeat-row" data-row="${rowId}">
    <div class="row-head"><span class="part-label">パターン<span class="row-no"></span></span>
      <button type="button" class="clear" data-remove="${rowId}">削除</button></div>
    ${p.fields.map(f => `<div class="sub"><div class="sub-label">${esc(f.label)}</div>${renderField(f, `${rowId}_${f.key}`)}</div>`).join("")}
  </div>`;
}

const repeatSeq = {};
function addRow(pid, n){
  const p = ALL_QS.flatMap(q => q.parts).find(x => x.id === pid);
  const box = form.querySelector(`[data-repeat="${pid}"]`);
  const rows = box.querySelector(".repeat-rows");
  if (rows.children.length >= p.max) return;
  if (n === undefined) n = repeatSeq[pid] = (repeatSeq[pid] ?? -1) + 1;
  else repeatSeq[pid] = Math.max(repeatSeq[pid] ?? -1, n);
  rows.insertAdjacentHTML("beforeend", repeatRow(p, n));
  refreshRepeat(pid);
}
function refreshRepeat(pid){
  const p = ALL_QS.flatMap(q => q.parts).find(x => x.id === pid);
  const box = form.querySelector(`[data-repeat="${pid}"]`);
  const rows = [...box.querySelectorAll(".repeat-row")];
  rows.forEach((r, i) => r.querySelector(".row-no").textContent = i + 1);
  box.querySelector(".add-row").hidden = rows.length >= p.max;
}

function build(){
  let html = "";
  for (const s of SECTIONS){
    html += `<section class="sheet"><div class="tab">${s.no}</div><div class="sheet-body"><h2>${esc(s.title)}</h2>`;
    if (s.note) html += `<p class="note">${esc(s.note)}</p>`;
    for (const q of s.qs){
      const framed = q.parts.length > 1;
      const tag = q.req ? `<span class="tag req">必須</span>` : q.opt ? `<span class="tag">任意</span>` : q.multi ? `<span class="tag">複数選択可</span>` : "";
      html += `<div class="q" data-q="${q.no}"><div class="q-head"><span class="q-no">${q.no}</span><span class="q-text">${esc(q.t)}${tag}</span></div>`;
      if (q.hint) html += `<p class="hint">${esc(q.hint)}</p>`;
      html += q.parts.map(p => renderPart(p, framed)).join("");
      if (q.none) html += `<div class="choices"><label class="choice"><input type="checkbox" id="${q.none.id}" value="${esc(q.none.label)}"><span>${esc(q.none.label)}</span></label></div>`;
      html += `</div>`;
    }
    html += `</div></section>`;
  }
  document.getElementById("questions").innerHTML = html;
  // 最初から1パターン表示しておく
  for (const q of ALL_QS) for (const p of q.parts) if (p.type === "repeat") addRow(p.id);
}

// ---------- 値の読み取り ----------
const checkedVals = name => [...form.querySelectorAll(`input[name="${CSS.escape(name)}"]:checked`)]
  .filter(el => !el.closest("[hidden]")).map(el => el.value);

function fieldValue(p, id){
  switch (p.type){
    case "radio":
    case "check": {
      let v = checkedVals(id);
      if (p.other){
        const t = (document.getElementById(id + "_other")?.value || "").trim();
        if (t) v = v.map(x => x === "その他" ? "その他：" + t : x);
      }
      return v.join("、");
    }
    case "rooms": return checkedVals(id).join("、");
    case "stepper": {
      const v = toHalf(document.getElementById(id).value);
      return v === "" ? "" : v + p.unit;
    }
    case "duration": return durText(id);
    default: return (document.getElementById(id)?.value || "").trim();
  }
}
function durText(id){
  const v = document.getElementById(id).value;
  if (v === "") return "";
  const box = document.querySelector(`[data-dur="${id}"]`);
  if (+v === 0 && box.dataset.zero) return box.dataset.zero;
  return fmtMin(v) + box.dataset.suffix;
}
function refreshDurations(){
  form.querySelectorAll("[data-dur]").forEach(box => {
    const id = box.dataset.dur;
    const t = durText(id);
    const out = document.getElementById(id + "_out");
    out.textContent = t || "未選択";
    box.classList.toggle("set", !!t);
    const num = document.getElementById(id + "_num");
    if (num && document.activeElement !== num) num.value = document.getElementById(id).value;
  });
}

// [{key, val}] の一覧にする（メール・送信データの元）
function collect(){
  const list = [];
  for (const q of ALL_QS){
    const base = `${q.no} ${q.t}`;
    for (const p of q.parts){
      const el = p.showIf ? form.querySelector(`[data-show-id="${p.showIf.id}"]`) : null;
      if (p.type === "repeat"){
        const rows = [...form.querySelectorAll(`[data-repeat="${p.id}"] .repeat-row`)];
        rows.forEach((r, i) => {
          const rowId = r.dataset.row;
          const val = p.fields.map(f => {
            const v = fieldValue(f, `${rowId}_${f.key}`);
            return v ? `${f.label}：${v}` : "";
          }).filter(Boolean).join("／");
          list.push({key: `${base}［パターン${i + 1}］`, val});
        });
        continue;
      }
      const hidden = el && el.hidden;
      const multi = q.parts.length > 1 || p.label;
      list.push({key: multi ? `${base}［${p.label || "回答"}］` : base, val: hidden ? "" : fieldValue(p, p.id)});
    }
    if (q.none && document.getElementById(q.none.id).checked){
      list.push({key: base, val: q.none.label});
    }
  }
  return list;
}

function qAnswered(q){
  if (q.none && document.getElementById(q.none.id).checked) return true;
  return q.parts.some(p => {
    if (p.type === "repeat"){
      return [...form.querySelectorAll(`[data-repeat="${p.id}"] .repeat-row`)]
        .some(r => p.fields.some(f => fieldValue(f, `${r.dataset.row}_${f.key}`)));
    }
    if (p.showIf){
      const el = form.querySelector(`[data-show-id="${p.showIf.id}"]`);
      if (el && el.hidden) return false;
    }
    return !!fieldValue(p, p.id);
  });
}

// ---------- 画面の更新 ----------
function refreshUI(){
  refreshDurations();
  // 店舗に合わせて部屋を絞り込む
  const store = checkedVals("q0_1")[0];
  form.querySelectorAll(".store").forEach(b => {
    b.hidden = !!store && store !== "両方" && b.dataset.store !== store;
  });
  // 「その他」を選んだときだけ入力欄を出す
  form.querySelectorAll("[data-other-for]").forEach(box => {
    const on = [...form.querySelectorAll(`input[name="${box.dataset.otherFor}"]:checked`)].some(x => x.value === "その他");
    box.hidden = !on;
  });
  // 条件つきの枠
  form.querySelectorAll("[data-show-id]").forEach(el => {
    el.hidden = checkedVals(el.dataset.showId)[0] !== el.dataset.showEq;
  });
  // 2-4: 「上限はかけていない」のときはパターンを隠す
  for (const q of ALL_QS) if (q.none){
    const off = document.getElementById(q.none.id).checked;
    for (const p of q.parts) if (p.type === "repeat") form.querySelector(`[data-repeat="${p.id}"]`).hidden = off;
  }
  // 進み具合
  const done = ALL_QS.filter(qAnswered).length;
  document.getElementById("progressText").textContent = `${done} / ${ALL_QS.length} 問`;
  document.getElementById("progressBar").style.width = (done / ALL_QS.length * 100) + "%";
  form.querySelectorAll(".q").forEach(el => {
    const q = ALL_QS.find(x => x.no === el.dataset.q);
    el.classList.toggle("answered", qAnswered(q));
  });
}

// 「特に決めていない」などを選んだら部屋の選択を外す（逆も同じ）
function handleNone(target){
  if (target.type !== "checkbox" || !target.checked) return;
  if (target.hasAttribute("data-none")){
    form.querySelectorAll(`input[name="${target.name}"]:not([data-none])`).forEach(x => x.checked = false);
  } else if (target.closest(".rooms")){
    const n = form.querySelector(`input[name="${target.name}"][data-none]`);
    if (n) n.checked = false;
  }
}

// ---------- 下書きの自動保存（この端末のみ） ----------
function saveDraft(){
  try{
    const raw = {values: {}, rows: {}};
    form.querySelectorAll("input,textarea,select").forEach(el => {
      if (!el.id || el.id === "honey") return;
      raw.values[el.id] = (el.type === "radio" || el.type === "checkbox") ? el.checked : el.value;
    });
    form.querySelectorAll("[data-repeat]").forEach(box => {
      raw.rows[box.dataset.repeat] = [...box.querySelectorAll(".repeat-row")].map(r => Number(r.dataset.row.split("_r").pop()));
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(raw));
  }catch(e){}
}
function loadDraft(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }catch(e){}
  if (!raw || !raw.values) return;
  for (const [pid, nums] of Object.entries(raw.rows || {})){
    const box = form.querySelector(`[data-repeat="${pid}"]`);
    if (!box || !nums.length) continue;
    box.querySelector(".repeat-rows").innerHTML = "";
    repeatSeq[pid] = -1;
    nums.forEach(n => addRow(pid, n));
  }
  for (const [id, v] of Object.entries(raw.values)){
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "radio" || el.type === "checkbox") el.checked = !!v; else el.value = v;
  }
}
function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} }

// ---------- 送信 ----------
function stamp(){
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function toText(list){
  return `【フロント業務アンケート 回答】\n回答日時：${stamp()}\n\n` +
    list.map(x => `${x.key}\n　→ ${x.val || "（未回答）"}`).join("\n");
}
function toPayload(list){
  const name = fieldValue({type:"text"}, "q0_5");
  const data = {_subject: `フロント業務アンケート回答${name ? `（${name}）` : ""}`, _template: "table", "回答日時": stamp()};
  for (const x of list) data[x.key] = x.val || "（未回答）";
  return data;
}

async function send(list){
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {"Content-Type": "application/json", "Accept": "application/json"},
    body: JSON.stringify(toPayload(list)),
  });
  let body = {};
  try{ body = await res.json(); }catch(e){}
  if (!(res.ok && (body.success === true || body.success === "true"))){
    throw new Error(body.message || `通信エラー（${res.status}）`);
  }
}

function show(id){
  for (const x of ["survey","done","failed"]) document.getElementById(x).hidden = (x !== id);
  document.getElementById("progress").hidden = id !== "survey";
  document.getElementById(id).scrollIntoView({block: "start"});
}

let lastList = null;
async function submitFlow(){
  const btn = document.getElementById("submitBtn"), retry = document.getElementById("retryBtn");
  btn.disabled = retry.disabled = true;
  btn.textContent = "送信中…";
  try{
    await send(lastList);
    clearDraft();
    show("done");
  }catch(e){
    document.getElementById("failMsg").textContent = "理由：" + e.message;
    document.getElementById("out").value = toText(lastList);
    document.getElementById("toast").textContent = "";
    show("failed");
  }finally{
    btn.disabled = retry.disabled = false;
    btn.textContent = "回答を送信する";
  }
}

async function copy(text, el, okMsg){
  const toast = document.getElementById("toast");
  try{
    await navigator.clipboard.writeText(text);
    toast.textContent = okMsg;
  }catch(e){
    if (el.select){ el.focus(); el.select(); }
    else { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    toast.textContent = "自動でコピーできませんでした。選択された文字を長押し（PCはCtrl+C）でコピーしてください。";
  }
}

// ---------- 初期化 ----------
build();
loadDraft();
form.querySelectorAll("[data-repeat]").forEach(b => refreshRepeat(b.dataset.repeat));
refreshUI();
document.getElementById("addr").textContent = MAIL_TO;

form.addEventListener("change", e => {
  handleNone(e.target);
  if (e.target.name === "q0_1"){
    form.querySelector('.q[data-q="0-1"]').classList.remove("missing");
    document.getElementById("err").hidden = true;
  }
  refreshUI(); saveDraft();
});
form.addEventListener("input", e => {
  if (e.target.type === "range") document.getElementById(e.target.id.replace(/_range$/, "")).value = e.target.value;
  if (e.target.classList.contains("dur-num")){
    const id = e.target.id.replace(/_num$/, "");
    const r = document.getElementById(id + "_range"), raw = toHalf(e.target.value);
    if (raw !== "" && +raw >= +r.min && +raw <= +r.max){ r.value = raw; document.getElementById(id).value = raw; }
    if (raw === "") document.getElementById(id).value = "";
  }
  refreshUI(); saveDraft();
});

// ---------- ＋−ボタン（タップで1つ、長押しで連続） ----------

function doStep(b){
  if (b.dataset.step){
    const input = document.getElementById(b.dataset.for);
    const box = b.closest(".stepper");
    const min = +box.dataset.min, max = +box.dataset.max, size = +box.dataset.stepsize || 1;
    const raw = toHalf(input.value);
    const cur = raw === "" ? null : +raw;
    let next = cur === null ? (b.dataset.step > 0 ? min : null) : cur + b.dataset.step * size;
    if (next !== null && next < min) next = null;
    if (next !== null && next > max) next = max;
    input.value = next === null ? "" : next;
  } else if (b.dataset.dstep){
    const r = document.getElementById(b.dataset.for + "_range");
    const h = document.getElementById(b.dataset.for);
    if (h.value !== "") r.value = +r.value + +b.dataset.dstep * +r.step;
    h.value = r.value;
  }
  refreshUI();
}

let holdTimer = null;
function stopHold(){
  if (holdTimer === null) return;
  clearTimeout(holdTimer); holdTimer = null;
  saveDraft();
}
form.addEventListener("pointerdown", e => {
  const b = e.target.closest(".step");
  if (!b || e.button > 0) return;
  e.preventDefault();
  stopHold();
  doStep(b);
  let n = 0;
  const repeat = () => { doStep(b); n++; holdTimer = setTimeout(repeat, n > 12 ? 40 : 90); };
  holdTimer = setTimeout(repeat, 400);   // 0.4秒押し続けると連続で増減
});
["pointerup","pointercancel","pointerleave"].forEach(t => form.addEventListener(t, e => {
  if (t !== "pointerleave" || (e.target.closest && e.target.closest(".step"))) stopHold();
}, true));
window.addEventListener("blur", stopHold);
form.addEventListener("contextmenu", e => { if (e.target.closest(".step")) e.preventDefault(); });

// 手入力した数字を範囲内に整える
function commitNumber(el){
  if (el.classList.contains("dur-num")){
    const id = el.id.replace(/_num$/, "");
    const r = document.getElementById(id + "_range"), h = document.getElementById(id);
    const raw = toHalf(el.value);
    if (raw === ""){ h.value = ""; }
    else {
      const v = Math.min(+r.max, Math.max(+r.min, +raw));
      r.value = v; h.value = v;
    }
    el.value = h.value;
  } else if (el.closest(".stepper")){
    const box = el.closest(".stepper");
    const raw = toHalf(el.value);
    el.value = raw === "" ? "" : Math.min(+box.dataset.max, Math.max(+box.dataset.min, +raw));
  }
}
form.addEventListener("focusout", e => {
  if (e.target.classList && e.target.classList.contains("num-input")){ commitNumber(e.target); refreshUI(); saveDraft(); }
});
form.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.classList && e.target.classList.contains("num-input")){
    e.preventDefault(); commitNumber(e.target); refreshUI(); saveDraft(); e.target.blur();
  }
});

form.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.step || b.dataset.dstep){
    // マウス・タッチは pointerdown で処理済み。キーボード操作（Enter/Space）のときだけここで動かす
    if (e.detail === 0) { doStep(b); saveDraft(); }
    return;
  } else if (b.dataset.dclear){
    document.getElementById(b.dataset.dclear).value = "";
  } else if (b.dataset.clear){
    document.getElementById(b.dataset.clear).value = "";
  } else if (b.dataset.add){
    addRow(b.dataset.add);
  } else if (b.dataset.remove){
    const row = form.querySelector(`[data-row="${b.dataset.remove}"]`);
    const box = row.closest("[data-repeat]");
    row.remove();
    if (!box.querySelector(".repeat-row")) addRow(box.dataset.repeat);
    refreshRepeat(box.dataset.repeat);
  } else return;
  refreshUI(); saveDraft();
});

// 送信ボタン（フォームの通常送信は使わないので、ページが読み直されて入力が消えることはない）
form.addEventListener("submit", e => { e.preventDefault(); return false; });

function onSubmitClick(){
  saveDraft(); // 念のため、確認の前に入力内容を保存しておく
  try{
    if (document.getElementById("honey").value) return; // ボット対策
    const err = document.getElementById("err");
    const q01 = form.querySelector('.q[data-q="0-1"]');
    if (!checkedVals("q0_1").length){
      err.textContent = "「0-1 主に入る店舗」が未回答です。選んでから、もう一度送信してください（ほかの回答は残っています）。";
      err.hidden = false;
      q01.classList.add("missing");
      q01.scrollIntoView({block: "center", behavior: "smooth"});
      setTimeout(() => { try{ document.getElementById("q0_1_0").focus({preventScroll: true}); }catch(e){} }, 400);
      return;
    }
    err.hidden = true;
    q01.classList.remove("missing");
    lastList = collect();
    submitFlow();
  }catch(e){
    // 予期しないエラーでも入力は消さない
    const err = document.getElementById("err");
    err.textContent = "送信の準備中にエラーが起きました。入力内容は残っています。もう一度お試しください。";
    err.hidden = false;
  }
}
document.getElementById("submitBtn").addEventListener("click", onSubmitClick);

document.getElementById("retryBtn").addEventListener("click", submitFlow);
document.getElementById("copyOut").addEventListener("click", () =>
  copy(document.getElementById("out").value, document.getElementById("out"), "回答をコピーしました。メールの本文に貼り付けて送信してください。"));
document.getElementById("copyAddr").addEventListener("click", () =>
  copy(MAIL_TO, document.getElementById("addr"), "アドレスをコピーしました。"));
