export interface RuntimeAdapter {
	read(path: string): Promise<string>
	write(path: string, content: string | Uint8Array<ArrayBufferLike>): Promise<void>
	exists(path: string): Promise<boolean>

	serve(options: ServeOptions): Promise<Server>

	scan(code: string): Promise<{ exports: string[]; imports: string[] }>

	env: Record<string, string | undefined>

	exit(code: number): never
}

export interface ServeOptions {
	port: number
	fetch: (request: Request) => Promise<Response>
}

export interface Server {
	stop(): void
}

export type AdapterFactory = (options?: any) => RuntimeAdapter
