/**
 * =============================================================================
 * 바이브 카페 주문서 및 주문 내역 스크립트 (script.js)
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// [Supabase 설정]
// - 아래 상수에 본인의 Supabase Project URL과 Anon API Key를 직접 입력해주세요.
// -----------------------------------------------------------------------------
const SUPABASE_URL = 'https://hbuxlaxupfvfujdlnale.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhidXhsYXh1cGZ2ZnVqZGxuYWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMzYxOTUsImV4cCI6MjEwNjgxMjE5NX0.o9eG5qFazEyHSJkSy5S-rALNB2G5GpLck8SUwPr3ygM';

// supabase-js 클라이언트 객체 초기화 (변수명: supabaseClient)
// CDN을 통해 로드된 window.supabase 객체를 사용해 클라이언트를 생성합니다.
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;


// HTML 문서(DOM)가 모두 준비되면 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

  // ---------------------------------------------------------------------------
  // 1. 필요한 HTML 태그(요소)들을 찾아옵니다.
  // ---------------------------------------------------------------------------
  // [탭 메뉴 및 각 탭 컨텐츠]
  const tabOrderBtn = document.getElementById('tabOrderBtn');             // '주문하기' 탭 버튼
  const tabHistoryBtn = document.getElementById('tabHistoryBtn');         // '주문 내역' 탭 버튼
  const orderTabContent = document.getElementById('orderTabContent');     // 주문하기 섹션 영역
  const historyTabContent = document.getElementById('historyTabContent'); // 주문 내역 섹션 영역
  const orderCountBadge = document.getElementById('orderCountBadge');     // 주문 건수 둥근 배지

  // [주문하기 폼 관련 요소]
  const orderForm = document.getElementById('orderForm');                 // 주문서 전체 폼
  const userNameInput = document.getElementById('userName');             // 고객 이름 입력칸
  const userPhoneInput = document.getElementById('userPhone');           // 전화번호 입력칸
  const drinkSelect = document.getElementById('drinkSelect');             // 음료 선택 드롭다운
  const sizeRadios = document.querySelectorAll('input[name="size"]');     // 사이즈 라디오 버튼 목록 (S, M, L)
  const optionCheckboxes = document.querySelectorAll('input[name="option"]'); // 추가 옵션 체크박스 목록
  const quantityInput = document.getElementById('orderQuantity');        // 수량 입력칸
  const orderRequestsInput = document.getElementById('orderRequests');   // 요청사항 텍스트 영역
  const totalPriceElement = document.getElementById('totalPrice');       // 예상 금액 숫자 표시 span
  const submitBtn = document.getElementById('submitBtn');                 // 주문하기 버튼
  const orderConfirmation = document.getElementById('orderConfirmation'); // 주문 확인 메시지 영역

  // [주문 내역 탭 관련 요소]
  const orderList = document.getElementById('orderList');                 // 주문 내역 카드들이 들어갈 컨테이너
  const orderSummaryArea = document.getElementById('orderSummaryArea');   // 총 주문 금액 및 지우기 버튼 영역
  const orderTotalSummary = document.getElementById('orderTotalSummary'); // 총 주문 금액 및 건수 텍스트
  const drinkSalesSummary = document.getElementById('drinkSalesSummary'); // 음료별 판매 수량 요약 텍스트
  const clearAllOrdersBtn = document.getElementById('clearAllOrdersBtn'); // '내역 모두 지우기' 버튼

  // ---------------------------------------------------------------------------
  // 2. 주문 데이터를 보관할 상태(State) 변수 및 localStorage 처리
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'vibe_cafe_orders'; // localStorage 저장용 키
  let orders = [];       // 접수된 주문 객체들을 담을 배열
  let orderSequence = 0; // 1부터 순차적으로 증가하는 고유 주문번호 (#1, #2...)

  /**
   * 주문 데이터를 localStorage에 저장하는 함수
   */
  function saveOrders() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error('주문 내역 저장 실패:', error);
    }
  }

  /**
   * localStorage에 저장된 주문 데이터를 불러오는 함수
   */
  function loadOrders() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        orders = JSON.parse(savedData);
        // 기존 주문들의 id 중 최댓값을 찾아 다음 주문번호가 이어지도록 설정
        orderSequence = orders.reduce((maxId, item) => Math.max(maxId, item.id || 0), 0);
      }
    } catch (error) {
      console.error('주문 내역 불러오기 실패:', error);
      orders = [];
      orderSequence = 0;
    }
  }


  // ---------------------------------------------------------------------------
  // 3. 탭 전환 기능
  //    - '주문하기'와 '주문 내역' 탭을 오갈 수 있도록 클래스와 hidden 속성을 조절합니다.
  // ---------------------------------------------------------------------------
  function switchTab(targetTab) {
    if (targetTab === 'order') {
      // 주문하기 탭 활성화
      tabOrderBtn.classList.add('active');
      tabHistoryBtn.classList.remove('active');
      orderTabContent.hidden = false;
      historyTabContent.hidden = true;
    } else if (targetTab === 'history') {
      // 주문 내역 탭 활성화
      tabHistoryBtn.classList.add('active');
      tabOrderBtn.classList.remove('active');
      historyTabContent.hidden = false;
      orderTabContent.hidden = true;
      // 탭을 열 때 최신 주문 목록을 다시 렌더링합니다.
      renderOrders();
    }
  }

  // 탭 버튼 클릭 이벤트 연결
  tabOrderBtn.addEventListener('click', () => switchTab('order'));
  tabHistoryBtn.addEventListener('click', () => switchTab('history'));


  // ---------------------------------------------------------------------------
  // 4. 예상 금액 계산 함수 (calculateTotal)
  //    - 음료, 사이즈, 옵션, 수량을 합산하여 총 금액을 계산하고 화면에 반영합니다.
  // ---------------------------------------------------------------------------
  function calculateTotal() {
    // 4-1. [조건] 음료를 아직 고르지 않았으면 무조건 0원으로 표시합니다.
    if (!drinkSelect.value) {
      totalPriceElement.textContent = '0';
      return 0;
    }

    // 4-2. 선택된 음료 기본 가격
    const selectedDrinkOption = drinkSelect.options[drinkSelect.selectedIndex];
    const drinkPrice = parseInt(selectedDrinkOption.dataset.price, 10) || 0;

    // 4-3. 선택된 사이즈 추가 금액
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const sizePrice = selectedSize ? (parseInt(selectedSize.dataset.price, 10) || 0) : 0;

    // 4-4. 선택된 추가 옵션 합계
    let optionsPrice = 0;
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    checkedOptions.forEach((checkbox) => {
      optionsPrice += parseInt(checkbox.dataset.price, 10) || 0;
    });

    // 4-5. 수량 (1 미만이나 빈 값은 기본 1)
    let quantity = parseInt(quantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }

    // 4-6. 총 금액 계산 = (음료 + 사이즈 + 옵션) * 수량
    const total = (drinkPrice + sizePrice + optionsPrice) * quantity;

    // 4-7. [조건] toLocaleString()으로 천 단위 콤마 표시
    totalPriceElement.textContent = total.toLocaleString();

    return total;
  }


  // ---------------------------------------------------------------------------
  // 5. 실시간 이벤트 등록
  // ---------------------------------------------------------------------------
  // (1) 음료 선택 변경
  drinkSelect.addEventListener('change', calculateTotal);

  // (2) 사이즈 선택 변경
  sizeRadios.forEach((radio) => {
    radio.addEventListener('change', calculateTotal);
  });

  // (3) 옵션 체크박스 변경
  optionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', calculateTotal);
  });

  // (4) 수량 입력 변경
  quantityInput.addEventListener('input', calculateTotal);
  quantityInput.addEventListener('change', calculateTotal);

  // (5) 전화번호 입력 시 자동으로 하이픈(-) 추가
  userPhoneInput.addEventListener('input', (event) => {
    const rawNumber = event.target.value.replace(/[^0-9]/g, '');
    let formattedNumber = '';

    // 서울 지역번호(02)로 시작하는 경우
    if (rawNumber.startsWith('02')) {
      if (rawNumber.length <= 2) {
        formattedNumber = rawNumber;
      } else if (rawNumber.length <= 5) {
        formattedNumber = `${rawNumber.slice(0, 2)}-${rawNumber.slice(2)}`;
      } else if (rawNumber.length <= 9) {
        formattedNumber = `${rawNumber.slice(0, 2)}-${rawNumber.slice(2, 5)}-${rawNumber.slice(5)}`;
      } else {
        formattedNumber = `${rawNumber.slice(0, 2)}-${rawNumber.slice(2, 6)}-${rawNumber.slice(6, 10)}`;
      }
    } else {
      // 일반 휴대폰(010 등) 및 일반 지역번호(031 등)
      if (rawNumber.length <= 3) {
        formattedNumber = rawNumber;
      } else if (rawNumber.length <= 7) {
        formattedNumber = `${rawNumber.slice(0, 3)}-${rawNumber.slice(3)}`;
      } else if (rawNumber.length <= 11) {
        formattedNumber = `${rawNumber.slice(0, 3)}-${rawNumber.slice(3, 7)}-${rawNumber.slice(7)}`;
      } else {
        formattedNumber = `${rawNumber.slice(0, 3)}-${rawNumber.slice(3, 7)}-${rawNumber.slice(7, 11)}`;
      }
    }

    event.target.value = formattedNumber;
  });


  // ---------------------------------------------------------------------------
  // 6. 주문 목록 화면 그리기 함수 (renderOrders) - [필수 조건]
  //    - 보안을 위해 손님이 입력한 글자는 innerHTML 대신 textContent로만 삽입합니다.
  // ---------------------------------------------------------------------------
  function renderOrders() {
    // 6-1. 탭 옆 배지에 현재 주문 건수 표시
    orderCountBadge.textContent = orders.length;

    // 6-2. 기존 목록 내용을 깨끗이 비웁니다.
    orderList.textContent = '';

    // 6-3. [조건] 주문이 하나도 없을 때
    if (orders.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-order-msg';
      emptyMessage.textContent = '아직 주문 내역이 없어요 ☕';
      orderList.appendChild(emptyMessage);

      // 하단 요약 및 전체 삭제 버튼 영역 숨김
      orderSummaryArea.hidden = true;
      return;
    }

    // 6-4. 주문이 있을 때는 요약 영역을 보여줍니다.
    orderSummaryArea.hidden = false;

    // 총 주문 금액 합계 계산
    const totalAmount = orders.reduce((sum, order) => sum + order.price, 0);
    orderTotalSummary.textContent = `총 주문 금액: ${totalAmount.toLocaleString()}원 (${orders.length}건)`;

    // [요약] 음료별 판매 잔수 집계 (예: "카페라떼 3잔, 아메리카노 1잔")
    const drinkCounts = {};
    orders.forEach((order) => {
      drinkCounts[order.drinkName] = (drinkCounts[order.drinkName] || 0) + order.quantity;
    });

    // 판매량이 많은 순으로 정렬하여 텍스트 생성
    const drinkSummaryText = Object.entries(drinkCounts)
      .sort((a, b) => b[1] - a[1]) // 판매 수량 내림차순 정렬
      .map(([name, count]) => `${name} ${count}잔`)
      .join(', ');

    // 보안을 위해 textContent 사용
    drinkSalesSummary.textContent = `음료별 판매: ${drinkSummaryText}`;

    // 6-5. 각 주문 카드를 생성하여 목록에 추가합니다.
    orders.forEach((order) => {
      // 베이지색 카드 컨테이너 생성
      const card = document.createElement('div');
      card.className = 'order-card';

      // [오른쪽 위 취소 버튼]
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'order-cancel-btn';
      cancelBtn.textContent = '취소';
      // 취소 버튼 클릭 시 confirm으로 확인 후 해당 주문 삭제
      cancelBtn.addEventListener('click', () => {
        if (confirm(`주문번호 #${order.id} (${order.userName}님) 주문을 취소하시겠습니까?`)) {
          // 해당 주문을 배열에서 제거하고 localStorage에 동기화
          orders = orders.filter((item) => item.id !== order.id);
          saveOrders();
          // 목록 및 배지 다시 그리기
          renderOrders();
        }
      });
      card.appendChild(cancelBtn);

      // [1줄]: "#1 홍길동님 · 5,000원"
      const line1 = document.createElement('div');
      line1.className = 'order-card-line1';
      line1.textContent = `#${order.id} ${order.userName}님 · ${order.price.toLocaleString()}원`;
      card.appendChild(line1);

      // [2줄]: "카페라떼 M사이즈 (샷 추가) 1잔"
      const line2 = document.createElement('div');
      line2.className = 'order-card-line2';
      line2.textContent = `${order.drinkName} ${order.sizeName}사이즈${order.optionText} ${order.quantity}잔`;
      card.appendChild(line2);

      // [3줄]: 요청사항(있을 때만) · 주문 시간
      const line3 = document.createElement('div');
      line3.className = 'order-card-line3';
      if (order.requests) {
        line3.textContent = `${order.requests} · ${order.orderTime}`;
      } else {
        line3.textContent = order.orderTime;
      }
      card.appendChild(line3);

      // 완성된 카드를 주문 목록에 추가
      orderList.appendChild(card);
    });
  }


  // ---------------------------------------------------------------------------
  // 7. 주문하기 버튼 클릭 (폼 submit 이벤트 처리 & Supabase 데이터베이스 저장)
  // ---------------------------------------------------------------------------
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // 기본 폼 제출 동작(새로고침) 방지

    // 7-1. 유효성 검사 (이름 필수)
    const userName = userNameInput.value.trim();
    if (!userName) {
      alert('이름을 입력해주세요');
      userNameInput.focus();
      return;
    }

    // 7-2. 유효성 검사 (음료 필수)
    if (!drinkSelect.value) {
      alert('음료를 선택해주세요');
      drinkSelect.focus();
      return;
    }

    // 7-3. 음료 이름 및 단가 추출 ("카페라떼 4,000원" -> "카페라떼", 4000)
    const selectedDrinkOption = drinkSelect.options[drinkSelect.selectedIndex];
    const drinkName = selectedDrinkOption.textContent.replace(/\s*\d{1,3}(,\d{3})*원/, '').trim();
    const drinkPrice = parseInt(selectedDrinkOption.dataset.price, 10) || 0;

    // 7-4. 사이즈 값 (S, M, L)
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const sizeName = selectedSize ? selectedSize.value : 'M';

    // 7-5. 추가 옵션 목록 가공 (배열 형태로 준비)
    const checkedOptions = document.querySelectorAll('input[name="option"]:checked');
    const optionList = [];
    checkedOptions.forEach((checkbox) => {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label) {
        const cleanName = label.textContent.replace(/\s*\+\d+원/, '').trim();
        optionList.push(cleanName);
      }
    });

    // 화면 메시지용 괄호 텍스트
    let optionText = '';
    if (optionList.length > 0) {
      optionText = ` (${optionList.join(', ')})`;
    }

    // 7-6. 수량 및 최종 금액
    let quantity = parseInt(quantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    }
    const finalTotal = calculateTotal();

    // 7-7. 요청사항, 전화번호, 현재 주문 시간
    const requests = orderRequestsInput.value.trim();
    const phone = userPhoneInput.value.trim();
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // -------------------------------------------------------------------------
    // 7-8. [중복 방지] 저장하는 동안 주문하기 버튼 비활성화
    // -------------------------------------------------------------------------
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '주문 저장 중...';

    try {
      // -----------------------------------------------------------------------
      // 7-9. Supabase의 cafe_menu03 테이블에 주문 저장 (insert)
      // 열 목록: customer_name, phone, drink, drink_price, size, options(배열), quantity, request, total_price
      // -----------------------------------------------------------------------
      if (!supabaseClient) {
        throw new Error('Supabase 클라이언트가 초기화되지 않았습니다. CDN 스크립트를 확인해주세요.');
      }

      const { data, error } = await supabaseClient
        .from('cafe_menu03')
        .insert([
          {
            customer_name: userName,
            phone: phone,
            drink: drinkName,
            drink_price: drinkPrice,
            size: sizeName,
            options: optionList, // 배열로 저장
            quantity: quantity,
            request: requests,
            total_price: finalTotal,
          },
        ]);

      // Supabase 에러 발생 시 예외 발생
      if (error) {
        throw error;
      }

      // -----------------------------------------------------------------------
      // 7-10. [저장 성공 시] 기존 주문 확인 및 목록 저장 처리
      // -----------------------------------------------------------------------
      orderSequence += 1;
      const newOrder = {
        id: orderSequence,
        userName: userName,
        drinkName: drinkName,
        sizeName: sizeName,
        optionText: optionText,
        quantity: quantity,
        requests: requests,
        price: finalTotal,
        orderTime: timeString,
      };

      // [조건] 최신 주문이 맨 위에 오도록 unshift로 맨 앞에 추가
      orders.unshift(newOrder);

      // [localStorage] 브라우저 저장소에 주문 내역 저장
      saveOrders();

      // 주문 내역 화면 및 배지 숫자 업데이트
      renderOrders();

      // [효과] 주문 접수 시 주문 건수 배지가 통통 튀는 애니메이션 실행
      orderCountBadge.classList.remove('badge-bounce');
      void orderCountBadge.offsetWidth; // 리플로우를 발생시켜 연속 주문 시에도 애니메이션이 다시 동작하도록 함
      orderCountBadge.classList.add('badge-bounce');

      // 기존 주문 확인 메시지 화면 표시
      const confirmationText = `${userName}님, ${drinkName} ${sizeName}사이즈${optionText} ${quantity}잔, 총 ${finalTotal.toLocaleString()}원 주문이 접수되었습니다!`;
      orderConfirmation.textContent = confirmationText;
      orderConfirmation.hidden = false;
      orderConfirmation.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      // [저장 실패 시] "주문 저장에 실패했어요" 알림 + 콘솔에 에러 출력
      alert('주문 저장에 실패했어요');
      console.error('주문 저장 실패 에러:', err);
    } finally {
      // -----------------------------------------------------------------------
      // 7-11. 저장이 완료되면(성공/실패 무관) 버튼을 다시 활성화
      // -----------------------------------------------------------------------
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });


  // ---------------------------------------------------------------------------
  // 8. 다시 작성 버튼 클릭 (폼 reset 이벤트)
  //    - [조건] 주문서만 초기화하고 주문 내역(orders)은 지우지 않습니다.
  // ---------------------------------------------------------------------------
  orderForm.addEventListener('reset', () => {
    setTimeout(() => {
      // 폼이 초기값(M사이즈, 수량 1)으로 돌아간 뒤 금액 0원으로 재계산
      calculateTotal();

      // 주문 확인 완료 메시지만 숨기기
      orderConfirmation.textContent = '';
      orderConfirmation.hidden = true;
    }, 0);
  });


  // ---------------------------------------------------------------------------
  // 9. '내역 모두 지우기' 버튼 클릭
  // ---------------------------------------------------------------------------
  clearAllOrdersBtn.addEventListener('click', () => {
    if (orders.length === 0) return;

    if (confirm('주문 내역을 모두 지우시겠습니까?')) {
      orders = [];
      saveOrders(); // [localStorage] 전체 삭제 후 브라우저 저장소 동기화
      renderOrders();
    }
  });


  // ---------------------------------------------------------------------------
  // 10. 초기 화면 로딩 실행
  // ---------------------------------------------------------------------------
  loadOrders();     // [localStorage] 이전에 저장된 주문 내역 불러오기
  calculateTotal(); // 예상 금액 0원 초기화
  renderOrders();   // 저장되어 있던 주문 내역(배지, 목록, 음료 요약) 렌더링
});
