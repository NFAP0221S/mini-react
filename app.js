
// createElement 함수는 
// 주어진 타입, 속성, 자식 요소들을 모아서 하나의 객체(Virtual DOM)로 반환합니다.
function createElement(type, props, ...children) {
  return { type, props: { ...props, children } }
}

// Virtual DOM 생성 및 렌더링 예제
// const element = createElement('div', { id: 'foo'},
//   createElement('a', null, 'bar'),
//   createElement('b'),
// )
// console.log(element);

// render 함수는 Virtual DOM을 실제 DOM으로 변환하여 페이지에 렌더링합니다.
function render(vnode, container) {
    // vnode가 문자열인 경우 텍스트 노드로 간주하고, 이를 DOM에 추가합니다.
    if (typeof vnode === 'string') {
      container.appendChild(document.createTextNode(vnode));
      return;
    }
    // vnode가 객체인 경우, 그 타입에 해당하는 DOM 요소를 생성합니다.
    const dom = document.createElement(vnode.type);
    // vnode에 속성이 있는 경우, 각 속성을 DOM 요소에 설정합니다.
    if (vnode.props) {
      Object.keys(vnode.props)
          .filter(key => key !== 'children') // 자식 요소는 따로 처리하므로 제외합니다.
          .forEach(key => dom[key] = vnode.props[key]); // 속성을 DOM 요소에 설정합니다.
    }
    console.log('# dom setup', dom)
    // vnode에 자식 요소가 있는 경우, 자식 요소를 재귀적으로 렌더링하여 DOM 요소에 추가합니다.
    if (vnode.props.children) {
      vnode.props.children.forEach(child => render(child, dom));
    }  
    console.log('# dom add', dom)
    // 완성된 DOM 요소를 부모 컨테이너에 추가합니다.
    container.appendChild(dom); 
}

function Test(props) {
  return(
    <div>
      <h1>안녕, {props.name}</h1>
      <p>이건 나의 컴포넌트야</p>
    </div>
  );
}

// App 컴포넌트를 정의합니다.
function App() {
  return (
    <div>
      <Test name="리액트" />
    </div>
  );
}

// 자동 렌더링 함수
function autoRender() {
  const root = document.getElementById('root');
  root.innerHTML = ''; // 기존 내용 지우기
  render(<App />, root); // App 컴포넌트를 루트 컴포넌트로 사용하여 렌더링
}

// const element = <Test name="World" />;

// const root = document.getElementById('root');
// render(element, root);

// function Test(props) {
//   return(
//     <div>
//       <h1>안녕, {props.name}</h1>
//       <p>이건 나의 컴포넌트야</p>
//     </div>
//   )
// }

// function App() {
//   return (
//       <div>
//           <Test name="리액트" />
//           {/* <AnotherComponent /> */}
//       </div>
//   );
// }

// function autoRender() {
//   const root = document.getElementById('root');
//   root.innerHTML = ''; // 기존 내용 지우기
//   render(<App />, root); // App 컴포넌트를 루트 컴포넌트로 사용하여 렌더링
// }

// // 페이지 로드 시 자동으로 렌더링
// autoRender();