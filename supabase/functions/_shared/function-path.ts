const normalizeFunctionPath = (pathname: string, functionName: string) => {
    const prefixes = [`/functions/v1/${functionName}`, `/${functionName}`];
    const prefix = prefixes.find((candidate) => {
        return pathname === candidate || pathname.startsWith(`${candidate}/`);
    });

    if (!prefix) return pathname === '/' ? '' : pathname;
    return pathname.slice(prefix.length);
};

export { normalizeFunctionPath };
