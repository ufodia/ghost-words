import {test,expect} from '@playwright/test';
async function tabTo(page,target){for(let i=0;i<150;i++){if(await target.evaluate(el=>el===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Control is not reachable with Tab');}
test('editing a transcript scrolls restored Tab targets into a short viewport',async({page})=>{
  await page.setViewportSize({width:320,height:256});
  await page.goto('/');
  const text=page.locator('#text-cue-2');
  const keep=page.locator('#keep-cue-2');
  const play=page.locator('#play-cue-2');
  await tabTo(page,text);
  await text.evaluate(el=>window.scrollBy(0,el.getBoundingClientRect().bottom-innerHeight));
  // Scroll offsets round to CSS pixels, so the bottom edge may differ fractionally.
  await expect(text).toBeInViewport({ratio:0.99});
  await page.keyboard.press('End');
  await page.keyboard.type(' edited');
  await page.keyboard.press('Tab');
  await expect(keep).toBeFocused();
  await expect(keep).toBeInViewport({ratio:1});
  await page.keyboard.press('Shift+Tab');
  await expect(text).toBeFocused();
  await expect(text).toBeInViewport({ratio:1});
  await page.keyboard.press('End');
  await page.keyboard.type(' again');
  await page.keyboard.press('Shift+Tab');
  await expect(play).toBeFocused();
  await expect(play).toBeInViewport({ratio:1});
  await page.keyboard.press('Tab');
  await expect(text).toBeFocused();
});
test('keyboard playback and review keep focus and expose the review state',async({page})=>{
  await page.goto('/');const play=page.locator('#play-cue-2');await tabTo(page,play);await page.keyboard.press('Enter');await expect(play).toBeFocused();
  await tabTo(page,page.locator('#text-cue-2'));await page.keyboard.press('Control+A');await page.keyboard.type('Keyboard transcript review');await page.keyboard.press('Tab');await expect(page.locator('#keep-cue-2')).toBeFocused();
  const remove=page.locator('#remove-cue-2');await tabTo(page,remove);await page.keyboard.press('Enter');await expect(remove).toBeFocused();await expect(remove).toHaveAttribute('aria-pressed','true');await expect(page.locator('#review-status')).toContainText('1 removed');
  const evidence=page.locator('#evidence-list .finding').first();await tabTo(page,evidence);const id=await evidence.getAttribute('id');await page.keyboard.press('Enter');await expect(page.locator(`[id="${id}"]`)).toBeFocused();
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
