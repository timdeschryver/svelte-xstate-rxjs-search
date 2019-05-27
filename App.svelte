<script>
  import { slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { of, BehaviorSubject, Subject } from "rxjs";
  import { fromFetch } from "rxjs/fetch";
  import {
    switchMap,
    catchError,
    debounceTime,
    takeUntil,
    skip,
    tap,
    delay
  } from "rxjs/operators";
  import { useMachine } from "./useMachine";
  import { queryMachine } from "./queryMachine";

  const query$ = new Subject();

  const { state, send } = useMachine(
    queryMachine.withConfig({
      actions: {
        search: ctx => query$.next(ctx.query)
      }
    }),
    { devTools: true }
  );

  const results$ = query$.pipe(
    debounceTime(547),
    tap(() => send("SEARCHING")),
    switchMap(q =>
      fromFetch(
        q === "error"
          ? "notexistingapitothrow"
          : `https://api.github.com/search/users?per_page=10&q=${q}`
      ).pipe(
        delay(2222), // we're using a slow API ... 🤷‍♂️
        takeUntil(query$.pipe(skip(1))),
        switchMap(response => {
          if (response.ok) {
            return response.json();
          }

          return of({ error: true, message: `Error ${response.status}` });
        }),
        catchError(err => of({ error: true, message: err.message }))
      )
    )
  );

  results$.subscribe({
    next: response => {
      if (response.error) {
        send({ type: "SEARCH_FAILED", message: response.message });
      } else {
        send({ type: "SEARCH_SUCCESS", items: response.items });
      }
    },
    error: () => console.error("ERROR")
  });

  $: context = $state.context;
</script>

<div data-state={$state.toStrings()}>
  <label for="search" class="block text-gray-700 text-sm font-bold mb-2">
    Search a GitHub user by name:
  </label>
  <div class="search">
    {#if $state.matches('waiting')}
      <div class="fulfilling-bouncing-circle-spinner">
        <div class="circle" />
        <div class="orbit" />
      </div>
    {/if}

    <input
      id="search"
      autocomplete="off"
      on:input={e => send({ type: 'INPUT', value: e.target.value })}
      class="bg-white focus:outline-0 focus:shadow-outline border
      border-gray-300 rounded-lg py-2 px-4 block w-full appearance-none
      leading-normal mb-6" />
  </div>

  {#if $state.matches('show_results')}
    <ul>
      {#each context.searchResults as result, index}
        <li
          transition:slide={{ delay: index * 100, duration: 250, easing: quintOut }}
          class="lg:rounded-b-none lg:rounded-r p-4 flex flex-col
          justify-between leading-normal bg-white shadow-md mb-3 hover:shadow-xl">
          <a href={result.html_url} class="flex items-center">
            <img
              class="w-10 h-10 rounded-full mr-4"
              alt={`Avatar of ${result.login}`}
              src={result.avatar_url} />
            <div class="text-sm">
              <p class="text-gray-900 leading-none"> {result.login} </p>
            </div>
          </a>
        </li>
      {:else}
        <div
          class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3
          rounded relative">
          <p>
            No users found with
            <strong class="font-bold">{context.query}</strong>
          </p>
        </div>
      {/each}
    </ul>
  {/if}

  {#if $state.matches('error_state')}
    <div
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded
      relative">
      <p>
        Search failed
        <strong class="font-bold"> {context.errorMessage}</strong>
      </p>
    </div>
  {/if}
</div>
