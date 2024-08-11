// 전역 변수들
let workInProgressRoot = null; // 현재 작업 중인 Fiber 트리의 루트
let currentRoot = null; // 마지막으로 커밋된 Fiber 트리의 루트
let nextUnitOfWork = null; // 다음에 작업할 Fiber
let wipFiber = null; // 현재 작업 중인 Fiber
let hookIndex = null; // 현재 처리 중인 훅의 인덱스
let deletions = null; // 삭제할 Fiber 목록 (삭제 효과를 관리하기 위해 사용)


// JSX를 처리하기 위한 함수 - React의 createElement와 유사
function createElement(type, props, ...children) {
  return {
    type, // 태그 이름 (예: 'div', 'h1') 또는 컴포넌트 함수
    props: {
      ...props, // 전달된 속성
      children: children.map(child =>
        typeof child === 'object'
          ? child // 자식이 객체이면 그대로 둠
          : createTextElement(child) // 문자열이면 텍스트 엘리먼트로 변환
      ),
    },
  };
}

// 텍스트 노드를 위한 특별한 처리 - 텍스트를 Fiber 트리에서 다루기 위한 객체로 변환
function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT', // 텍스트 노드를 위한 특수 타입
    props: {
      nodeValue: text, // 실제 텍스트 값
      children: [], // 텍스트 노드에는 자식이 없음
    },
  };
}

// Fiber에서 DOM 노드를 생성하는 함수
function createDom(fiber) {
  // 텍스트 노드인지 아닌지에 따라 처리
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode(fiber.props.nodeValue) // 텍스트 노드 생성
      : document.createElement(fiber.type); // 일반 DOM 노드 생성

  // DOM 노드에 속성 적용
  updateDom(dom, {}, fiber.props);

  return dom;
}

// DOM 노드를 업데이트하는 함수
function updateDom(dom, prevProps, nextProps) {
  // 이전 속성들 중 삭제되거나 변경된 것들을 제거
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '';
    });

  // 새로운 속성들을 추가하거나 업데이트
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });

  // 이벤트 리스너 제거
  Object.keys(prevProps)
    .filter(name => name.startsWith('on'))
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 새로운 이벤트 리스너 추가
  Object.keys(nextProps)
    .filter(name => name.startsWith('on'))
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

// 속성인지 확인하는 함수 (children과 on으로 시작하는 속성은 제외)
function isProperty(key) {
  return key !== 'children' && !key.startsWith('on');
}

// 새로운 속성인지 확인하는 함수
function isNew(prev, next) {
  return key => prev[key] !== next[key];
}

// 삭제된 속성인지 확인하는 함수
function isGone(prev, next) {
  return key => !(key in next);
}

// React의 render 함수와 유사한 역할 - Fiber 트리의 루트를 설정하고 작업을 시작
function render(element, container) {
  workInProgressRoot = {
    dom: container, // 최종 DOM이 적용될 컨테이너
    props: {
      children: [element], // 렌더링할 요소 (보통 최상위 App 컴포넌트)
    },
    alternate: currentRoot, // 이전에 커밋된 Fiber 트리와 비교하기 위해 사용
  };
  deletions = []; // 삭제할 Fiber 목록 초기화
  nextUnitOfWork = workInProgressRoot; // 작업의 시작점 설정
}

// Fiber 트리의 작업을 수행하는 루프
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 다음 작업 단위 실행
    shouldYield = deadline.timeRemaining() < 1; // 시간이 부족하면 중단 (협력적 스케줄링)
  }

  // 모든 작업이 끝났으면 커밋
  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop); // 브라우저가 유휴 상태일 때 다시 작업 시작
}

requestIdleCallback(workLoop); // 초기 작업 시작

// 개별 작업 단위를 수행하는 함수
function performUnitOfWork(fiber) {
  wipFiber = fiber; // 현재 작업 중인 Fiber 설정
  hookIndex = 0; // 훅 인덱스 초기화
  wipFiber.hooks = []; // 훅 배열 초기화

  if (typeof fiber.type === 'function') {
    // 함수 컴포넌트일 경우
    const children = [fiber.type(fiber.props)]; // 컴포넌트 호출 후 자식 컴포넌트 생성
    reconcileChildren(fiber, children); // 새로운 자식 Fiber들로 업데이트
  } else {
    if (!fiber.dom) {
      fiber.dom = createDom(fiber); // DOM 노드 생성
    }
    reconcileChildren(fiber, fiber.props.children); // 자식 Fiber들로 업데이트
  }

  // 자식 Fiber가 있으면 다음 작업 단위로 설정
  if (fiber.child) {
    return fiber.child;
  }

  // 자식이 없으면 형제 Fiber로 이동, 형제도 없으면 부모의 형제로 이동
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

// 자식 Fiber 노드들을 재조정하는 함수
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child; // 이전에 커밋된 Fiber
  let prevSibling = null;

  // 새로운 엘리먼트들과 이전 Fiber를 비교하면서 새로운 Fiber 트리 생성
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    const sameType = oldFiber && element && element.type == oldFiber.type;

    // 이전과 같은 타입이면 업데이트
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    // 타입이 다르면 새로운 Fiber 생성
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }
    // 이전 Fiber가 있고 타입이 다르면 삭제 처리
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber); // 삭제할 Fiber 목록에 추가
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling; // 다음 형제 Fiber로 이동
    }

    // 새로운 Fiber를 부모에 연결
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber; // 형제 관계 연결
    index++;
  }
}

// 모든 작업이 끝난 후 DOM에 실제로 반영하는 커밋 단계
function commitRoot() {
  deletions.forEach(commitWork); // 삭제 작업 실행
  commitWork(workInProgressRoot.child); // 새로운 작업 반영
  currentRoot = workInProgressRoot; // 현재 트리로 설정
  workInProgressRoot = null; // 작업 트리 초기화
}

// 각 Fiber 노드를 DOM에 적용하는 함수
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  // 부모 DOM 노드 찾기
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  // 새로운 노드일 경우 부모 노드에 추가
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } 
  // 기존 노드의 속성을 업데이트
  else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } 
  // 삭제할 노드일 경우 DOM에서 제거
  else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent);
    return;
  }

  // 자식과 형제 노드도 재귀적으로 커밋
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

// DOM에서 노드를 제거하는 함수
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom); // DOM에서 제거
  } else {
    commitDeletion(fiber.child, domParent); // 자식도 재귀적으로 제거
  }
}

// useState 훅 구현 - 컴포넌트 상태 관리
function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]; // 이전 훅 참조
  const hook = {
    state: oldHook ? oldHook.state : initial, // 이전 상태가 있으면 그 상태로, 없으면 초기 상태로
    queue: [], // 상태 변경 큐
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = action(hook.state); // 모든 액션 실행하여 상태 업데이트
  });

  const setState = action => {
    hook.queue.push(action); // 액션 큐에 추가
    workInProgressRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = workInProgressRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook); // 훅을 Fiber에 추가
  hookIndex++;
  return [hook.state, setState]; // 현재 상태와 상태를 업데이트하는 함수 반환
}

// useEffect 훅 구현 - 사이드 이펙트 처리
function useEffect(effect, deps) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]; // 이전 훅 참조
  const hook = {
    deps,
  };

  const hasChanged = deps
    ? !oldHook || deps.some((dep, i) => !Object.is(dep, oldHook.deps[i])) // 종속성 배열 비교
    : true;

  if (hasChanged) {
    effect(); // 종속성이 변경되었으면 effect 실행
  }

  wipFiber.hooks.push(hook); // 훅을 Fiber에 추가
  hookIndex++;
}

// useRef 훅 구현 - 참조 관리
function useRef(initialValue) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]; // 이전 훅 참조
  const hook = {
    ref: oldHook ? oldHook.ref : { current: initialValue }, // 초기값을 갖는 ref 객체 생성
  };

  wipFiber.hooks.push(hook); // 훅을 Fiber에 추가
  hookIndex++;
  return hook.ref; // ref 객체 반환
}

// MyReact 객체 내보내기
export const MyReact = {
  createElement,
  render,
  useState,
  useEffect,
  useRef,
};
