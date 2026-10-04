<script>
  import Deck from "./lib/Deck.svelte";
  import Slide from "./lib/Slide.svelte";
  import Step from "./lib/Step.svelte";
  import Timeline from "./slides/Timeline.svelte";
  import Differentiation from "./slides/Differentiation.svelte";
  import Metaxy from "./slides/Metaxy.svelte";
  import Consciousness from "./slides/Consciousness.svelte";
  import ThreeAges from "./slides/ThreeAges.svelte";
  import CountUp from "./slides/CountUp.svelte";
  import waves from "./assets/waves.svg";
</script>

<Deck transition="fade" progress slideNumbers>
  <Slide layout="title" id="intro" number={false}>
    <p class="kicker">Eric Voegelin · 1901–1985</p>
    <h1>In Search of Order</h1>
    <p>History, consciousness, and <em>what is called God</em></p>
    {#snippet notes()}
      <p>The title is borrowed from the fifth and last volume of <em>Order and History</em>, which he left unfinished.</p>
      <p>Press <strong>O</strong> for the overview, <strong>P</strong> for this presenter view.</p>
    {/snippet}
  </Slide>

  <Slide id="more">
    <h2>More than a critic of Gnosticism</h2>
    <ul>
      <Step as="li" effect="rise">History as the unfolding of experiences of order</Step>
      <Step as="li" effect="rise">Consciousness as participation, not a subject facing objects</Step>
      <Step as="li" effect="rise">Symbols live only as long as the experiences behind them</Step>
      <Step as="li" effect="rise">Ideology as a disease of the spirit, not a mistake in logic</Step>
      <Step as="li" effect="rise">And, at the very end, the question of God</Step>
    </ul>
    {#snippet notes()}
      <p>In the English-speaking world he is mostly known for one phrase he never quite wrote: "don't immanentize the eschaton," William F. Buckley's slogan distilled from <em>The New Science of Politics</em>.</p>
      <p>The diagnosis of Gnosticism is a consequence of the rest: a theory of consciousness and a philosophy of history. That is what this talk is about.</p>
    {/snippet}
  </Slide>

  <Slide id="life">
    <h2>A life in search of order</h2>
    <Timeline />
    {#snippet notes()}
      <p>One step per milestone. Note the places: Cologne, Vienna, exile in the United States (mostly Louisiana State University, 1942–58), Munich, where he founded the Institute for Political Science, and the Hoover Institution at Stanford.</p>
    {/snippet}
  </Slide>

  <Slide layout="section" transition="slide" id="history">
    <p class="kicker" style:color="inherit">Part 1</p>
    <h1>The order of history</h1>
    <p>emerges from the history of order</p>
    {#snippet notes()}
      <p>The first sentence of the preface to <em>Israel and Revelation</em> (1956), volume I of <em>Order and History</em>.</p>
    {/snippet}
  </Slide>

  <Slide id="community">
    <h2>“God and man, world and society form a primordial community of being”</h2>
    <div class="chart-row grow">
      <div class="chart"><Differentiation /></div>
      <ol class="legend">
        <li><strong>Compact.</strong> Cosmological myth: society is a little cosmos, the king its mediator</li>
        <Step as="li" at="1" effect="highlight"><strong>Israel.</strong> The leap in being: God beyond the cosmos</Step>
        <Step as="li" at="2" effect="highlight"><strong>Hellas.</strong> The psyche: man as the place where the divine is met</Step>
        <Step as="li" at="3" effect="highlight"><strong>Differentiated.</strong> Four partners, still one community</Step>
      </ol>
    </div>
    {#snippet notes()}
      <p>The opening line of the Introduction to <em>Israel and Revelation</em>.</p>
      <p>Differentiation is not progress in knowledge of new things. The same reality is experienced more articulately. Nothing that was compact is lost, but it can be forgotten.</p>
      <p>The highlighted line is Plato's "golden cord" (<em>Laws</em>): the pull of the divine on the soul.</p>
    {/snippet}
  </Slide>

  <Slide layout="split" id="ecumenic">
    <h2>The plan that broke</h2>
    <div>
      <h3 class="muted">Order and History I–III (1956–57)</h3>
      <ul>
        <Step as="li" effect="dim">Cosmological empires</Step>
        <Step as="li" effect="dim">Israel: revelation</Step>
        <Step as="li" effect="dim">Hellas: philosophy</Step>
        <Step as="li" effect="dim">… then Christianity, modernity</Step>
      </ul>
    </div>
    <div>
      <h3 class="accent">The Ecumenic Age (1974)</h3>
      <ul>
        <Step as="li" effect="rise">Lines of meaning run in parallel, not in one line</Step>
        <Step as="li" effect="rise"><em>Historiogenesis</em>: the single line is itself a myth, from the Sumerian King List to Hegel</Step>
        <Step as="li" effect="rise">There is no outside from which to tell the whole story</Step>
      </ul>
    </div>
    {#snippet notes()}
      <p>Seventeen years separate volumes III and IV. He explained that the original program, a sequence of types of order, could not hold the material: the differentiations were spread across empires and centuries in no single line.</p>
    {/snippet}
  </Slide>

  <Slide layout="section" transition="slide" id="consciousness">
    <p class="kicker" style:color="inherit">Part 2</p>
    <h1>Consciousness</h1>
    <p>Existence has the structure of the In-Between</p>
  </Slide>

  <Slide id="metaxy">
    <h2>The <span lang="el">metaxy</span>: life in tension</h2>
    <Metaxy />
    {#snippet notes()}
      <p>Plato's word from the <em>Symposium</em>: Eros is a daimon, between mortal and immortal. Voegelin makes it the structure of human existence as such.</p>
      <p>Two movements: our search (<span lang="el">zetesis</span>) and being drawn (<span lang="el">helkein</span>). Neither pole can be possessed. Collapsing the tension into one pole is the root of deformation.</p>
    {/snippet}
  </Slide>

  <Slide layout="split" id="luminosity">
    <h2>A paradox in consciousness</h2>
    <ol class="legend big">
      <li><strong>Intentionality.</strong> I, in a body, intend a thing: the reality of objects</li>
      <Step as="li" at="1" effect="highlight"><strong>Luminosity.</strong> Consciousness is an event within the reality it illumines: the It</Step>
      <Step as="li" at="2" effect="highlight"><strong>Both at once.</strong> Language too: it refers to things, and is how the It speaks</Step>
    </ol>
    <Consciousness />
    {#snippet notes()}
      <p>From <em>In Search of Order</em>: "thing-reality" and "It-reality". The subject–object model is true but partial. We do not stand outside reality to observe it; it becomes luminous through us.</p>
    {/snippet}
  </Slide>

  <Slide id="anamnesis">
    <h2><span lang="el">Anamnesis</span>: remembering what was forgotten</h2>
    <ul>
      <Step as="li" effect="rise">1943, letters to Alfred Schütz: Husserl's consciousness is a stream watched from nowhere</Step>
      <Step as="li" effect="rise">Instead, recollect where one's own consciousness first opened onto reality</Step>
      <Step as="li" effect="rise">The <em>anamnetic experiments</em>: remembered childhood experiences</Step>
      <Step as="li" effect="rise">Philosophy as recovery, not construction</Step>
    </ul>
    {#snippet notes()}
      <p>Published together, much later, in <em>Anamnesis</em> (1966). The word is Plato's: knowing as remembering.</p>
      <p>A theory of consciousness cannot be a system deduced from a premise. It has to start from a concrete consciousness, his own, and its history.</p>
    {/snippet}
  </Slide>

  <Slide id="equivalences">
    <h2>Equivalences of experience and symbolization</h2>
    <div class="flow grow">
      <div><span class="n">1</span><h3>Experience</h3><p>An encounter with the ground of being</p></div>
      <Step effect="rise"><span class="n">2</span><h3>Symbol</h3><p>Myth, revelation, philosophy articulate it</p></Step>
      <Step effect="rise"><span class="n">3</span><h3>Doctrine</h3><p>The symbol outlives the experience and hardens</p></Step>
      <Step effect="rise" class="accent-box"><span class="n">4</span><h3>Anamnesis</h3><p>Trace the symbol back to what engendered it</p></Step>
    </div>
    {#snippet notes()}
      <p>The 1970 essay. Symbols from different civilizations are not competing truths but equivalent articulations of one constant: the structure of existence in the In-Between.</p>
      <p>Doctrine is not bad. It protects. But once separated from experience, it invites the reaction against it, and "dogmatomachy" follows.</p>
    {/snippet}
  </Slide>

  <Slide layout="section" transition="slide" id="gnosis">
    <p class="kicker" style:color="inherit">Part 3</p>
    <h1>The modern revolt</h1>
    <p>Gnosticism, and more than Gnosticism</p>
  </Slide>

  <Slide layout="quote" id="uncertainty">
    <blockquote>Uncertainty is the very essence of Christianity.</blockquote>
    <cite>— The New Science of Politics (1952)</cite>
    {#snippet notes()}
      <p>Faith, in Hebrews 11:1, is "the substance of things hoped for, the evidence of things not seen". It is a tenuous bond. Gnosis offers a certainty that faith cannot, and many could not bear the uncertainty.</p>
    {/snippet}
  </Slide>

  <Slide id="features">
    <h2>Six features of the gnostic attitude</h2>
    <ol class="features">
      <Step as="li" effect="dim">Dissatisfaction with one's situation</Step>
      <Step as="li" effect="dim">The cause: the world is badly organized</Step>
      <Step as="li" effect="dim">Salvation from the evil of the world is possible</Step>
      <Step as="li" effect="dim">The order of being must change in history</Step>
      <Step as="li" effect="dim">The change is within human power</Step>
      <Step as="li" effect="rise" class="accent">And requires the right knowledge: <em>gnosis</em></Step>
    </ol>
    {#snippet notes()}
      <p>From <em>Science, Politics and Gnosticism</em> (1959). The first is ordinary human experience. The rest is a progressive refusal of the tension of the metaxy.</p>
    {/snippet}
  </Slide>

  <Slide id="eschaton">
    <h2>Immanentizing the eschaton</h2>
    <ThreeAges />
    {#snippet notes()}
      <p>Try the buttons. Joachim of Fiore (12th century) divided history into three ages. Voegelin finds the same pattern of symbols, with a leader, a prophet, and a community of the perfected, in its secular heirs.</p>
      <p>The Christian eschaton is beyond history. These constructions place the fulfilment inside it.</p>
    {/snippet}
  </Slide>

  <Slide layout="split" id="beyond-gnosis">
    <h2>Not only Gnosticism</h2>
    <div>
      <h3 class="accent">The diagnosis widened</h3>
      <ul>
        <Step as="li" effect="rise">Apocalyptic expectation</Step>
        <Step as="li" effect="rise">Neoplatonism, hermeticism, magic, alchemy</Step>
        <Step as="li" effect="rise">The <em>egophanic revolt</em>: the self as the center of reality</Step>
      </ul>
    </div>
    <div>
      <h3 class="accent">Its symptoms</h3>
      <ul>
        <Step as="li" effect="rise">A <em>second reality</em> built over the first</Step>
        <Step as="li" effect="rise">The prohibition of questions</Step>
        <Step as="li" effect="rise">Loss of the In-Between: <em>pneumopathology</em></Step>
      </ul>
    </div>
    {#snippet notes()}
      <p>Later Voegelin said "Gnosticism" was too narrow a name. The deeper problem is the deformation of consciousness, of which Gnosticism is one historical variety.</p>
      <p>"Second reality" is borrowed from Musil and Doderer. "Prohibition of questions": Marx, in the Paris manuscripts, tells the questioner about the origin of man and nature to give up his abstraction, and his question with it.</p>
    {/snippet}
  </Slide>

  <Slide layout="section" transition="slide" id="quod-deus">
    <p class="kicker" style:color="inherit">Part 4</p>
    <h1><span lang="la">Quod Deus dicitur</span></h1>
    <p>What is called God: his last essay, 1985</p>
  </Slide>

  <Slide layout="split" id="what-is-called-god">
    <h2>Proofs as questioning</h2>
    <ol class="legend big">
      <Step as="li" effect="highlight"><strong>Aquinas</strong> ends a proof: <span lang="la">quod omnes dicunt Deum</span>, “which all call God”</Step>
      <Step as="li" effect="highlight"><strong>Anselm</strong> proves inside a prayer: <span lang="la">fides quaerens intellectum</span></Step>
      <Step as="li" effect="highlight"><strong>Leibniz</strong> asks: why something, and not nothing? Why so, and not otherwise?</Step>
    </ol>
    <div class="claim">
      <Step as="p" at="4" effect="rise">The proofs do not reach an object at the end of a syllogism.</Step>
      <Step as="p" at="5" effect="rise">They articulate a questioning already moved by the ground it seeks.</Step>
      <Step as="p" at="6" effect="rise" class="accent">“God” names that ground: <em>what is called</em> God.</Step>
    </div>
    {#snippet notes()}
      <p>Worked on in the last weeks of his life; he died on 19 January 1985.</p>
      <p>The title comes from the five ways in the <em>Summa</em>, which end not with "therefore God exists" but with "and this is what everyone calls God". Separated from the experience of questioning, "God" becomes a thing in a proposition, and the proposition invites its denial.</p>
    {/snippet}
  </Slide>

  <Slide layout="center" id="works">
    <CountUp value={34} />
    <p class="muted">volumes of <em>The Collected Works of Eric Voegelin</em></p>
  </Slide>

  <Slide layout="bleed" transition="zoom" id="beyond">
    <img src={waves} alt="" />
    <p>Reality is not a thing, but the process between the <em>Beginning</em> and the <em>Beyond</em>.</p>
  </Slide>

  <Slide layout="quote" id="mystery">
    <blockquote>The process of history … is not a story to be told from the beginning to its happy, or unhappy, end; it is a mystery in process of revelation.</blockquote>
    <cite>— The Ecumenic Age (1974)</cite>
  </Slide>

  <Slide layout="split" id="reading">
    <h2>Where to start</h2>
    <div>
      <h3 class="accent">Short</h3>
      <ul>
        <li><em>Autobiographical Reflections</em></li>
        <li><em>Science, Politics and Gnosticism</em></li>
        <li>“Reason: The Classic Experience”</li>
        <li>“Equivalences of Experience and Symbolization in History”</li>
      </ul>
    </div>
    <div>
      <h3 class="accent">Long</h3>
      <ul>
        <li><em>The New Science of Politics</em></li>
        <li><em>Anamnesis</em></li>
        <li><em>Order and History</em>, IV and V</li>
        <li>“Quod Deus Dicitur”, in <em>Collected Works</em> 12</li>
      </ul>
    </div>
  </Slide>

  <Slide layout="title" id="thanks" number={false}>
    <h1>Thanks</h1>
    <p>Source: <code>demos/svelte</code> · run it with <code>mise run dev:svelte</code></p>
  </Slide>
</Deck>

<style>
  .chart-row {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: var(--deck-gap);
    align-items: center;
  }
  .chart {
    height: 100%;
    min-height: 0;
  }
  .legend {
    list-style: none;
    padding: 0;
    font-size: var(--deck-size-small);
    gap: 0.9em;
  }
  .legend.big {
    font-size: var(--deck-size-body);
    align-self: center;
  }
  .legend strong {
    font-weight: 600;
  }
  .flow {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    align-items: center;
  }
  .flow > :global(*) {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 40px 36px;
    background: var(--deck-surface);
    border-radius: var(--deck-radius);
  }
  .flow > :global(.accent-box) {
    background: var(--deck-accent);
    color: var(--deck-accent-fg);
  }
  .flow h3 {
    font-size: 56px;
    font-weight: 500;
  }
  .flow p {
    font-size: var(--deck-size-small);
  }
  .n {
    font: 600 26px var(--deck-font-mono);
    opacity: 0.6;
  }
  .features {
    font-size: 48px;
    gap: 0.4em;
  }
  :global(#beyond) img {
    filter: grayscale(1) sepia(0.9) brightness(0.85);
  }
  .claim {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1em;
  }
</style>
