import { MyReact } from './myReact';

export function Counter() {
  const [count, setCount] = MyReact.useState(0);

  MyReact.useEffect(() => {
    console.log('Count updated:', count);
  }, [count]);

  return (
    <h1 onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </h1>
  );
}
