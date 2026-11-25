/* Softbound v3: shared note data (SCENE owns this file). ?n=120 seeds extra notes to prove the shelf scales. */
(function () {
  'use strict';
  var notes = [
    {id:1, title:"Kyoto in April", body:"Philosopher's Path at 6am before the crowds. Fushimi Inari, top gate at sunset. Ask Kenji about the tofu place in Arashiyama.", tag:"Travel", date:"Apr 2", mood:"calm"},
    {id:2, title:"Grandma's dal makhani", body:"Soak urad overnight. Butter at the end, never the start. Smoke with a hot coal in a steel bowl for 2 minutes.", tag:"Recipes", date:"Mar 28", mood:"warm"},
    {id:3, title:"Things to tell Mira", body:"The bakery reopened. That song from the wedding is called 'Saibo'. She was right about the blue sofa.", tag:"Personal", date:"Mar 25", mood:"tender"},
    {id:4, title:"Q3 launch ideas", body:"Waitlist with a referral ladder. Founder video, no slides. Ship the dark mode first, it's what people screenshot.", tag:"Work", date:"Mar 21", mood:"bright"},
    {id:5, title:"Books for the monsoon", body:"Pachinko. The Overstory. A Suitable Boy (finally). Re-read Invisible Cities.", tag:"Reading", date:"Mar 17", mood:"calm"}
  ];
  var n = 0;
  try { n = parseInt(new URLSearchParams(location.search).get('n'), 10) || 0; } catch (e) {}
  if (n > notes.length) {
    var tags = ['Travel', 'Recipes', 'Personal', 'Work', 'Reading', 'Ideas'];
    var words = ['Lisbon', 'Sourdough', 'Garden', 'Roadmap', 'Haiku', 'Ceramics', 'Monsoon', 'Market', 'Letters', 'Sketches', 'Tea', 'Harbour', 'Retro', 'Moodboard', 'Fern', 'Ramen', 'Atlas', 'Studio', 'Weekend', 'Kites'];
    var kinds = ['notes', 'list', 'plan', 'diary', 'ideas', 'draft'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var i = notes.length; i < n; i++) {
      notes.push({id: i + 1, title: words[(i * 7) % words.length] + ' ' + kinds[(i * 3) % kinds.length], body: 'Seeded note ' + (i + 1) + '.',
        tag: tags[i % tags.length], date: months[i % 12] + ' ' + (1 + (i * 5) % 28), mood: 'calm'});
    }
  }
  window.SB_NOTES = notes;
  window.SB_CLOTH = {Travel:'#A9C8EE', Recipes:'#F5B98A', Personal:'#EFB3C2', Work:'#A8DCC4', Reading:'#F3DB8C', Ideas:'#CDBDF2'};
  window.SB_RIBBON = {Travel:'#E98C73', Recipes:'#5FA98A', Personal:'#8E7DD2', Work:'#EC8F94', Reading:'#6A93D3', Ideas:'#EBBE5E'};
  window.SB_INK = {Travel:'#2C4E78', Recipes:'#7A3F1C', Personal:'#80344B', Work:'#1E5A43', Reading:'#6A4C07', Ideas:'#4B3D8A'};
})();
