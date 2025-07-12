import { useMemo, useState } from "react";

/**
 * 一个用于管理对象状态的自定义 Hook
 * 
 * @description
 * 这个 Hook 提供了一种便捷的方式来管理对象类型的状态。它的工作原理如下:
 * 1. 接收一个初始对象状态
 * 2. 返回当前状态和一个更新函数
 * 3. 更新函数支持两种方式更新状态:
 *    - 直接传入新的部分状态对象
 *    - 传入一个函数来基于之前的状态计算新状态
 * 4. 新的状态会与之前的状态进行浅合并
 * 
 * @template T - 状态对象的类型,必须是一个键值对记录类型
 * @param initialState - 初始状态对象
 * @returns 返回一个元组,包含 [当前状态, 更新函数]
 * 
 * @example
 * ```ts
 * const [state, setState] = useObjectState({ name: '', age: 0 });
 * // 直接更新
 * setState({ name: 'John' }); 
 * // 函数式更新
 * setState(prev => ({ age: prev.age + 1 }));
 * ```
 */
export const useObjectState = <T extends Record<string, any>>(
  initialState: T,
) => {
  const [state, setState] = useState<T>(initialState);

  const dispatch = useMemo(() => {
    return (value: Mutate<T>) => {
      setState((prev) => {
        const newState = typeof value === "function" ? value(prev) : value;
        return { ...prev, ...newState };
      });
    };
  }, []);

  return [state, dispatch] as const;
};
