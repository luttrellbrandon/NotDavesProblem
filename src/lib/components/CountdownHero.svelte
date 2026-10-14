<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		HERO_VIEWS,
		getPrimaryNumber,
		getRemaining,
		getViewLabel,
		type CountdownViewId,
		type HeroViewId
	} from '#lib/countdown';
	import { getFunMeasure, isFunMeasureId } from '#lib/fun-measures';
	import { loadNumberFact, type NumberFactResult } from '#lib/number-fact';
	import { BRAND_NAME, RETIREE_NAME, RETIREMENT_INSTANT_MS } from '#lib/retirement';
	import RetiredState from './RetiredState.svelte';

	const VIEW_DWELL_MS = 17000;
	const TICK_MS = 1000;

	function pad(value: number): string {
		return String(value).padStart(2, '0');
	}

	const prefersReducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const fadeMs = $derived(prefersReducedMotion.current ? 0 : 450);
	const factFadeMs = $derived(prefersReducedMotion.current ? 0 : 350);

	let nowMs = $state(Date.now());
	let viewIndex = $state(0);
	let headerClockUnlocked = $state(false);
	let numberFactPromise = $state<Promise<NumberFactResult>>(
		Promise.resolve({ fact: null, tone: 'normal' })
	);

	const remaining = $derived(getRemaining(nowMs, RETIREMENT_INSTANT_MS));
	const isRetired = $derived(remaining.isRetired);
	const currentView = $derived(HERO_VIEWS[viewIndex] as HeroViewId);
	const funMeasure = $derived.by(() => {
		if (!isFunMeasureId(currentView)) return null;
		return getFunMeasure(currentView, remaining, nowMs, RETIREMENT_INSTANT_MS);
	});
	const primaryNumber = $derived.by(() => {
		if (isFunMeasureId(currentView)) return 0;
		return getPrimaryNumber(currentView, remaining);
	});
	const viewLabel = $derived.by(() => {
		if (isFunMeasureId(currentView)) return '';
		return getViewLabel(currentView);
	});
	const headerClockText = $derived(
		`${remaining.days}d ${pad(remaining.hours)}h ${pad(remaining.minutes)}m ${pad(remaining.seconds)}s`
	);
	const headerClockAriaLabel = $derived(
		`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, and ${remaining.seconds} seconds remaining`
	);
	const showHeaderClock = $derived(headerClockUnlocked && !isRetired);

	// Clock tick — intentional $effect + setInterval (cleanup on destroy).
	$effect(() => {
		const id = setInterval(() => {
			nowMs = Date.now();
		}, TICK_MS);

		return () => clearInterval(id);
	});

	// View rotation dwell — same pattern; skipped once retired.
	// Unlock Header Clock the first time we leave the opening Full Clock.
	$effect(() => {
		if (isRetired) return;

		const id = setInterval(() => {
			if (viewIndex === 0) {
				headerClockUnlocked = true;
			}
			viewIndex = (viewIndex + 1) % HERO_VIEWS.length;
		}, VIEW_DWELL_MS);

		return () => clearInterval(id);
	});

	// Snapshot Primary Number when Countdown View changes (not every clock tick).
	$effect(() => {
		if (isRetired) return;

		const view = currentView;
		const n = untrack(() => {
			if (isFunMeasureId(view)) {
				return getFunMeasure(view, remaining, nowMs, RETIREMENT_INSTANT_MS).factInteger;
			}
			return getPrimaryNumber(view as CountdownViewId, remaining);
		});

		numberFactPromise = loadNumberFact(n);
	});
</script>

{#if showHeaderClock}
	<p
		class="header-clock fixed top-3 left-3 z-10 text-xs tabular-nums text-base-content/45 sm:top-4 sm:left-4 sm:text-sm"
		aria-label={headerClockAriaLabel}
	>
		{headerClockText}
	</p>
{/if}

<main class="hero flex min-h-dvh w-full items-center justify-center px-6 py-8 sm:py-10">
	{#if isRetired}
		<div in:fade={{ duration: fadeMs }}>
			<RetiredState />
		</div>
	{:else}
		<section
			class="composition flex w-full max-w-3xl flex-col items-center gap-4 text-center sm:gap-5 md:gap-6"
		>
			<h1
				class="brand font-display text-4xl font-bold leading-none tracking-tight text-primary sm:text-5xl md:text-6xl"
			>
				{BRAND_NAME}
			</h1>

			<p class="support max-w-xl text-base leading-relaxed text-base-content/80 sm:text-lg">
				Counting down to {RETIREE_NAME}'s retirement.
			</p>

			<!-- Avoid DaisyUI's `.countdown` class — it forces --value digits to 0. -->
			<div
				class="clock-stage relative flex w-full min-h-[9.5rem] items-center justify-center sm:min-h-[11rem]"
			>
				{#key currentView}
					<div
						class="clock-panel absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 sm:gap-3"
						in:fade={{ duration: fadeMs }}
						out:fade={{ duration: fadeMs }}
					>
						{#if currentView === 'full'}
							<div
								class="full-clock grid grid-cols-4 gap-3 sm:gap-5"
								aria-label="Days, hours, minutes, and seconds remaining"
							>
								{#each [
									{ value: remaining.days, label: 'days' },
									{ value: remaining.hours, label: 'hours' },
									{ value: remaining.minutes, label: 'mins' },
									{ value: remaining.seconds, label: 'secs' }
								] as part (part.label)}
									<div class="part flex flex-col items-center gap-1">
										<span
											class="num tick font-display text-3xl font-bold leading-none tabular-nums text-base-content sm:text-4xl md:text-5xl"
										>
											{part.label === 'days' ? part.value : pad(part.value)}
										</span>
										<span
											class="unit text-xs uppercase tracking-widest text-base-content/60 sm:text-sm"
										>
											{part.label}
										</span>
									</div>
								{/each}
							</div>
							<p class="view-label text-sm text-base-content/70 sm:text-base">{viewLabel}</p>
						{:else if funMeasure}
							<p
								class="num tick font-display text-4xl font-bold leading-none tabular-nums text-base-content sm:text-5xl md:text-6xl"
								aria-live="polite"
							>
								{funMeasure.primary}
							</p>
							<p
								class="view-label max-w-xl text-base leading-snug text-base-content/75 sm:text-lg"
							>
								{funMeasure.sentence}
							</p>
						{:else}
							<p
								class="num tick font-display text-5xl font-bold leading-none tabular-nums text-base-content sm:text-6xl md:text-7xl"
								aria-live="polite"
							>
								{primaryNumber.toLocaleString()}
							</p>
							<p
								class="view-label text-base uppercase tracking-widest text-base-content/70 sm:text-lg"
							>
								{viewLabel}
							</p>
						{/if}
					</div>
				{/key}
			</div>

			<div class="fact-slot min-h-[3rem] max-w-xl" aria-live="polite">
				{#key currentView}
					{#await numberFactPromise}
						<p
							class="fact text-sm italic text-base-content/50 sm:text-base"
							in:fade={{ duration: factFadeMs }}
						>
							Looking up a number fact…
						</p>
					{:then result}
						{#if result.fact}
							<p
								class="fact text-sm italic leading-relaxed text-base-content/70 sm:text-base"
								in:fade={{ duration: factFadeMs }}
							>
								{result.fact}
							</p>
						{/if}
					{/await}
				{/key}
			</div>
		</section>
	{/if}
</main>

<style>
	.hero {
		background:
			radial-gradient(
				ellipse 80% 60% at 50% 0%,
				color-mix(in oklch, var(--color-primary) 18%, transparent),
				transparent 70%
			),
			radial-gradient(
				ellipse 70% 50% at 80% 100%,
				color-mix(in oklch, var(--color-secondary) 12%, transparent),
				transparent 65%
			),
			var(--color-base-200);
	}

	.tick {
		animation: tick-soft 1s ease-in-out infinite;
	}

	@keyframes tick-soft {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.88;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tick {
			animation: none;
		}
	}
</style>
