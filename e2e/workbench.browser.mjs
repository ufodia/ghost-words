import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function getDownload(page,button){
  const wait=page.waitForEvent('download');
  await button.click();
  const download=await wait;
  return {download,content:await readFile(await download.path(),'utf8')};
}

test('local workbench: analysis, evidence, export and responsive layout',async({page},testInfo)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const done=[];
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
      await expect(page.locator('.cue-row')).toHaveCount(5);await expect(page.locator('#finding-count')).toContainText('flags');
      expect(await page.locator('audio').evaluate(el=>el.duration)).toBeGreaterThan(10);
      await page.locator('.cue-row').nth(1).getByRole('button',{name:'Remove line',exact:true}).click();const exported=await getDownload(page,page.locator('#export-srt'));expect(exported.content).not.toContain('Thank you for watching');
      await page.locator('#clear').click();await expect(page.locator('#export-srt')).toBeDisabled();
      await page.locator('#transcript-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});await expect(page.locator('#message')).toHaveClass(/error/);
      await page.locator('#demo').click();done.push('Playable real synthetic WAV','Five timed cues and energy flags','Reviewed SRT exclusion','Invalid import and clear state');
  await page.screenshot({path:testInfo.outputPath('desktop.png'),fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('mobile.png'),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false);
  expect(errors).toEqual([]);
});
